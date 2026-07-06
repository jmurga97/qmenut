import { and, asc, eq } from "drizzle-orm";

import { restaurantLanguages, restaurants } from "../schema/restaurants";

import type { DrizzleDb } from "../client";

export interface RestaurantLanguage {
  isActive: boolean;
  isDefault: boolean;
  languageCode: string;
}

export interface RestaurantLanguageInfo {
  defaultLanguageCode: string;
  languages: RestaurantLanguage[];
}

interface RestaurantInput {
  db: DrizzleDb;
  restaurantId: string;
}

interface LanguageCodeInput extends RestaurantInput {
  languageCode: string;
}

interface SetLanguageActiveInput extends LanguageCodeInput {
  isActive: boolean;
}

export async function getRestaurantLanguageInfo({
  db,
  restaurantId,
}: RestaurantInput): Promise<RestaurantLanguageInfo | null> {
  const restaurant = await db
    .select({ defaultLanguageCode: restaurants.defaultLanguageCode })
    .from(restaurants)
    .where(eq(restaurants.id, restaurantId))
    .get();

  if (!restaurant) {
    return null;
  }

  const languages = await db
    .select({
      languageCode: restaurantLanguages.languageCode,
      isDefault: restaurantLanguages.isDefault,
      isActive: restaurantLanguages.isActive,
    })
    .from(restaurantLanguages)
    .where(eq(restaurantLanguages.restaurantId, restaurantId))
    .orderBy(asc(restaurantLanguages.languageCode))
    .all();

  return {
    defaultLanguageCode: restaurant.defaultLanguageCode,
    languages,
  };
}

export async function addRestaurantLanguage({ db, languageCode, restaurantId }: LanguageCodeInput): Promise<void> {
  await db
    .insert(restaurantLanguages)
    .values({
      restaurantId,
      languageCode,
      isDefault: false,
      isActive: true,
      createdAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: [restaurantLanguages.restaurantId, restaurantLanguages.languageCode],
      set: { isActive: true },
    });
}

export async function setRestaurantLanguageActive({
  db,
  isActive,
  languageCode,
  restaurantId,
}: SetLanguageActiveInput): Promise<void> {
  await db
    .update(restaurantLanguages)
    .set({ isActive })
    .where(
      and(
        eq(restaurantLanguages.restaurantId, restaurantId),
        eq(restaurantLanguages.languageCode, languageCode),
        eq(restaurantLanguages.isDefault, false),
      ),
    );
}

export async function removeRestaurantLanguage({ db, languageCode, restaurantId }: LanguageCodeInput): Promise<void> {
  await db
    .delete(restaurantLanguages)
    .where(
      and(
        eq(restaurantLanguages.restaurantId, restaurantId),
        eq(restaurantLanguages.languageCode, languageCode),
        eq(restaurantLanguages.isDefault, false),
      ),
    );
}
