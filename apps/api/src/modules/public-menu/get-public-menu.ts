import { getRestaurantLanguageInfo } from "@qmenut/db/repositories/restaurant-languages.repository";
import { getPublicMenu as findPublicMenu } from "@qmenut/db/repositories/public-menu.repository";

import { sanitizeNullableDescription } from "./sanitize-description";

import type { DrizzleDb } from "@qmenut/db";
import type { ResolvedTenant } from "@qmenut/db/domain/tenant";
import type { PublicCategory, PublicMenuData, PublicMenuLanguage } from "@qmenut/db/models/public-menu";

export const FALLBACK_LANGUAGE_CODE = "es";

interface GetPublicMenuInput {
  db: DrizzleDb;
  locale?: string | undefined;
  nowMs?: number | undefined;
  tenant: ResolvedTenant;
}

export type PublicMenuPayload = PublicMenuData & { language: PublicMenuLanguage };

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
}: GetPublicMenuInput): Promise<PublicMenuPayload | null> {
  const info = await getRestaurantLanguageInfo({ db, restaurantId: tenant.restaurantId });
  const defaultLanguage = info?.defaultLanguageCode ?? FALLBACK_LANGUAGE_CODE;
  const activeLanguages = (info?.languages ?? []).filter((language) => language.isActive);
  const requested = locale?.toLowerCase() ?? null;
  const effective =
    requested !== null && activeLanguages.some((language) => language.languageCode === requested)
      ? requested
      : defaultLanguage;
  const data = await findPublicMenu({
    db,
    nowMs,
    tenant,
    locale: effective,
    isDefaultLocale: effective === defaultLanguage,
  });

  if (!data) {
    return null;
  }

  return {
    ...data,
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
  };
}
