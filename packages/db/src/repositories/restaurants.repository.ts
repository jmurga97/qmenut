import { and, eq, isNull } from "drizzle-orm";

import { restaurants } from "../schema/restaurants";

import type { DrizzleDb } from "../client";

export interface RestaurantSummary {
  id: string;
  name: string;
  defaultLanguageCode: string;
  defaultCurrency: string;
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
    })
    .from(restaurants)
    .where(and(eq(restaurants.id, restaurantId), isNull(restaurants.deletedAt)))
    .get();

  return row ?? null;
}
