import { and, eq, isNull } from "drizzle-orm";

import { restaurants } from "../schema/restaurants";

import type { DrizzleDb } from "../client";
import type { BatchItem } from "drizzle-orm/batch";

export interface RestaurantSummary {
  id: string;
  name: string;
  defaultLanguageCode: string;
  defaultCurrency: string;
  timezone: string;
}

interface GetRestaurantByIdInput {
  db: DrizzleDb;
  restaurantId: string;
}

export async function getRestaurantById({
  db,
  restaurantId,
}: GetRestaurantByIdInput): Promise<RestaurantSummary | null> {
  const row = await db
    .select({
      id: restaurants.id,
      name: restaurants.name,
      defaultLanguageCode: restaurants.defaultLanguageCode,
      defaultCurrency: restaurants.defaultCurrency,
      timezone: restaurants.timezone,
    })
    .from(restaurants)
    .where(and(eq(restaurants.id, restaurantId), isNull(restaurants.deletedAt)))
    .get();

  return row ?? null;
}

interface UpdateRestaurantTimezoneInput {
  db: DrizzleDb;
  restaurantId: string;
  timezone: string;
}

export function updateRestaurantTimezoneStatement({
  db,
  restaurantId,
  timezone,
}: UpdateRestaurantTimezoneInput): BatchItem<"sqlite"> {
  return db
    .update(restaurants)
    .set({ timezone, updatedAt: Date.now() })
    .where(and(eq(restaurants.id, restaurantId), isNull(restaurants.deletedAt)));
}
