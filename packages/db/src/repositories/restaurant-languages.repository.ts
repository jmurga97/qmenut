import { and, asc, eq } from "drizzle-orm";

import { restaurantLanguages, restaurants } from "../schema/restaurants";

import type { DrizzleDb } from "../client";
import type { BatchItem } from "drizzle-orm/batch";

export interface RestaurantLanguage {
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
    })
    .from(restaurantLanguages)
    .where(eq(restaurantLanguages.restaurantId, restaurantId))
    .orderBy(asc(restaurantLanguages.languageCode))
    .all();

  return {
    defaultLanguageCode: restaurant.defaultLanguageCode,
    languages: [
      { languageCode: restaurant.defaultLanguageCode, isDefault: true },
      ...languages
        .filter((language) => language.languageCode !== restaurant.defaultLanguageCode)
        .map((language) => ({ ...language, isDefault: false })),
    ],
  };
}

export async function addRestaurantLanguage({ db, languageCode, restaurantId }: LanguageCodeInput): Promise<void> {
  await db
    .insert(restaurantLanguages)
    .values({
      restaurantId,
      languageCode,
      createdAt: Date.now(),
    })
    .onConflictDoNothing();
}

export function removeRestaurantLanguageStatement({
  db,
  languageCode,
  restaurantId,
}: LanguageCodeInput): BatchItem<"sqlite"> {
  return db
    .delete(restaurantLanguages)
    .where(and(eq(restaurantLanguages.restaurantId, restaurantId), eq(restaurantLanguages.languageCode, languageCode)));
}
