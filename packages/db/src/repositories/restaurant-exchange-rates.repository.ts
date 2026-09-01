import { eq } from "drizzle-orm";

import { restaurantExchangeRates } from "../schema/exchange-rates";

import type { DrizzleDb } from "../client";

export interface RestaurantExchangeRate {
  isEnabled: boolean;
  rate: string;
  restaurantId: string;
  updatedAt: number;
  updatedBy: string;
}

interface RestaurantExchangeRateInput {
  db: DrizzleDb;
  restaurantId: string;
}

export async function getRestaurantExchangeRate({
  db,
  restaurantId,
}: RestaurantExchangeRateInput): Promise<RestaurantExchangeRate | null> {
  const row = await db
    .select()
    .from(restaurantExchangeRates)
    .where(eq(restaurantExchangeRates.restaurantId, restaurantId))
    .get();

  return row ?? null;
}

interface UpsertRestaurantExchangeRateInput extends RestaurantExchangeRateInput {
  isEnabled: boolean;
  rate: string;
  updatedBy: string;
}

export async function upsertRestaurantExchangeRate({
  db,
  isEnabled,
  rate,
  restaurantId,
  updatedBy,
}: UpsertRestaurantExchangeRateInput): Promise<RestaurantExchangeRate> {
  const updatedAt = Date.now();

  await db
    .insert(restaurantExchangeRates)
    .values({ restaurantId, rate, isEnabled, updatedBy, updatedAt })
    .onConflictDoUpdate({
      target: restaurantExchangeRates.restaurantId,
      set: { rate, isEnabled, updatedBy, updatedAt },
    });

  const persisted = await getRestaurantExchangeRate({ db, restaurantId });

  if (!persisted) {
    throw new Error("Failed to persist or load restaurant exchange rate");
  }

  return persisted;
}
