import { getPublicMenu as findPublicMenu } from "@qmenut/db/repositories/public-menu.repository";
import { getRestaurantLanguageInfo } from "@qmenut/db/repositories/restaurant-languages.repository";

import { sanitizeNullableDescription } from "./sanitize-description";
import { getLanguageCatalogEntry } from "../admin-translations/language-catalog";
import { getTranslationContent, languageTexts, publicTranslationMap } from "../admin-translations/translation-content";
import { getPublicLoyaltyFeatures } from "../loyalty/get-loyalty-program";

import type { RuntimeEnv } from "../../config/env/schema";
import type { PublicLoyaltyFeatures } from "../loyalty/get-loyalty-program";
import type { DrizzleDb } from "@qmenut/db/client";
import type { ResolvedTenant } from "@qmenut/db/domain/tenant";
import type { PublicCategory, PublicMenuData, PublicMenuLanguage } from "@qmenut/db/models/public-menu";

export const FALLBACK_LANGUAGE_CODE = "es";

interface GetPublicMenuInput {
  db: DrizzleDb;
  locale?: string;
  nowMs?: number;
  tenant: ResolvedTenant;
  env?: RuntimeEnv;
}

export type PublicMenuPayload = PublicMenuData & {
  language: PublicMenuLanguage;
  publicFeatures: PublicLoyaltyFeatures;
  tagline: string;
};

function sanitizeCategories(categories: PublicCategory[]): PublicCategory[] {
  return categories.map((category) => ({
    ...category,
    description: sanitizeNullableDescription(category.description),
    dishes: category.dishes.map((dish) => ({
      ...dish,
      description: sanitizeNullableDescription(dish.description),
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
  const info = await getRestaurantLanguageInfo({ db, restaurantId: tenant.restaurantId });
  const defaultLanguage = info?.defaultLanguageCode ?? FALLBACK_LANGUAGE_CODE;
  const content = await getTranslationContent({ db, env, restaurantId: tenant.restaurantId });
  const activeLanguages = (info?.languages ?? [{ languageCode: defaultLanguage, isDefault: true }]).filter(
    (language) =>
      language.isDefault ||
      (Boolean(getLanguageCatalogEntry(language.languageCode)) &&
        languageTexts(content, language.languageCode).every((item) => item.complete)),
  );
  const requested = locale?.toLowerCase() ?? null;
  const effective =
    requested !== null && activeLanguages.some((language) => language.languageCode === requested)
      ? requested
      : defaultLanguage;
  const translatedTexts =
    effective === defaultLanguage ? undefined : publicTranslationMap(languageTexts(content, effective));
  const [data, publicFeatures] = await Promise.all([
    findPublicMenu({
      db,
      nowMs,
      tenant,
      locale: effective,
      isDefaultLocale: effective === defaultLanguage,
      translatedTexts,
    }),
    getPublicLoyaltyFeatures({ db, restaurantId: tenant.restaurantId }),
  ]);

  if (!data) {
    return null;
  }

  return {
    ...data,
    tagline:
      effective === defaultLanguage
        ? (content.texts.find((item) => item.entityId === tenant.branchId && item.field === "tagline")?.text ?? "")
        : (languageTexts(content, effective).find(
            (item) => item.entityId === tenant.branchId && item.field === "tagline",
          )?.value ?? ""),
    categories: sanitizeCategories(data.categories),
    language: {
      available: activeLanguages.map((language) => ({
        code: language.languageCode,
        isDefault: language.languageCode === defaultLanguage,
      })),
      default: defaultLanguage,
      effective,
      requested,
    },
    publicFeatures,
  };
}
