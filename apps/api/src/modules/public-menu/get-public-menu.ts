import { getPublicMenu as findPublicMenu } from "@qmenut/db/repositories/public-menu.repository";
import { isReservationsOpen } from "@qmenut/db/repositories/reservations.repository";
import { getRestaurantLanguageInfo } from "@qmenut/db/repositories/restaurant-languages.repository";
import { hasFeature } from "@qmenut/permissions";

import { sanitizeNullableDescription } from "./sanitize-description";
import { getLanguageCatalogEntry } from "../admin-translations/language-catalog";
import { getTranslationContent, languageTexts, publicTranslationMap } from "../admin-translations/translation-content";
import { getPublicLoyaltyFeatures } from "../loyalty/get-loyalty-program";

import type { RuntimeEnv } from "../../config/env/schema";
import type { PublicLoyaltyFeatures } from "../loyalty/get-loyalty-program";
import type { DrizzleDb } from "@qmenut/db/client";
import type { PublicTenant } from "@qmenut/db/domain/tenant";
import type { PublicCategory, PublicMenuData, PublicMenuLanguage } from "@qmenut/db/models/public-menu";
import type { PlanFeature } from "@qmenut/permissions";

export const FALLBACK_LANGUAGE_CODE = "es";

interface GetPublicMenuInput {
  db: DrizzleDb;
  locale?: string;
  nowMs?: number;
  tenant: PublicTenant;
  env?: RuntimeEnv;
}

export type PublicMenuPayload = PublicMenuData & {
  language: PublicMenuLanguage;
  publicFeatures: PublicLoyaltyFeatures & { highlights: boolean; pwa: boolean; reservations: boolean };
  tagline: string;
};

type PlanCheck = (feature: PlanFeature) => boolean;

/** Business content stays stored on Basic; it is only left out of what diners receive. */
function sanitizeCategories(categories: PublicCategory[], can: PlanCheck): PublicCategory[] {
  return categories.map((category) => ({
    ...category,
    description: sanitizeNullableDescription(category.description),
    dishes: category.dishes.map((dish) => ({
      ...dish,
      availabilityWindows: can("menu.schedules") ? dish.availabilityWindows : [],
      description: sanitizeNullableDescription(dish.description),
      isFeatured: can("highlights") && dish.isFeatured,
      isRecommended: can("highlights") && dish.isRecommended,
      promotion: can("promotions") ? dish.promotion : null,
    })),
  }));
}

export async function getPublicMenu({
  db,
  locale,
  nowMs = Date.now(),
  tenant,
  env,
}: GetPublicMenuInput): Promise<PublicMenuPayload | null> {
  const can: PlanCheck = (feature) => hasFeature([tenant.planCode], feature);
  const info = await getRestaurantLanguageInfo({ db, restaurantId: tenant.restaurantId });
  const defaultLanguage = info?.defaultLanguageCode ?? FALLBACK_LANGUAGE_CODE;
  const content = await getTranslationContent({ db, env, restaurantId: tenant.restaurantId });
  const activeLanguages = (info?.languages ?? [{ languageCode: defaultLanguage, isDefault: true }]).filter(
    (language) =>
      language.isDefault ||
      (can("languages") &&
        Boolean(getLanguageCatalogEntry(language.languageCode)) &&
        languageTexts(content, language.languageCode).every((item) => item.complete)),
  );
  const requested = locale?.toLowerCase() ?? null;
  const effective =
    requested !== null && activeLanguages.some((language) => language.languageCode === requested)
      ? requested
      : defaultLanguage;
  const translatedTexts =
    effective === defaultLanguage ? undefined : publicTranslationMap(languageTexts(content, effective));
  const [data, publicFeatures, reservations] = await Promise.all([
    findPublicMenu({
      applySchedules: can("menu.schedules"),
      db,
      nowMs,
      tenant,
      locale: effective,
      isDefaultLocale: effective === defaultLanguage,
      translatedTexts,
    }),
    can("loyalty") ? getPublicLoyaltyFeatures({ db, restaurantId: tenant.restaurantId }) : { loyalty: false },
    can("reservations") && isReservationsOpen({ db, branchId: tenant.branchId }),
  ]);

  if (!data) {
    return null;
  }

  return {
    ...data,
    branch: {
      ...data.branch,
      googleReviewsEnabled: can("contact.googleReviews") && data.branch.googleReviewsEnabled,
      // The first photo is the cover every plan keeps.
      photos: can("contact.gallery") ? data.branch.photos : data.branch.photos.slice(0, 1),
    },
    promotions: can("promotions") ? data.promotions : [],
    tagline:
      effective === defaultLanguage
        ? (content.texts.find((item) => item.entityId === tenant.branchId && item.field === "tagline")?.text ?? "")
        : (languageTexts(content, effective).find(
            (item) => item.entityId === tenant.branchId && item.field === "tagline",
          )?.value ?? ""),
    categories: sanitizeCategories(data.categories, can),
    language: {
      available: activeLanguages.map((language) => ({
        code: language.languageCode,
        isDefault: language.languageCode === defaultLanguage,
        label: getLanguageCatalogEntry(language.languageCode)?.label ?? language.languageCode,
      })),
      default: defaultLanguage,
      effective,
      requested,
    },
    publicFeatures: { ...publicFeatures, highlights: can("highlights"), pwa: can("pwa"), reservations },
  };
}
