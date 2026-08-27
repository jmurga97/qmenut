import { and, eq, isNull } from "drizzle-orm";

import { restaurants } from "../schema/restaurants";

import type { DrizzleDb } from "../client";
import type { BatchItem } from "drizzle-orm/batch";

export interface RestaurantSummary {
  countryCode: string;
  dataProtectionEmail: string | null;
  defaultCurrency: string;
  defaultLanguageCode: string;
  id: string;
  legalAddress: string | null;
  legalName: string | null;
  name: string;
  taxId: string | null;
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
      countryCode: restaurants.countryCode,
      defaultLanguageCode: restaurants.defaultLanguageCode,
      defaultCurrency: restaurants.defaultCurrency,
      dataProtectionEmail: restaurants.dataProtectionEmail,
      legalAddress: restaurants.legalAddress,
      legalName: restaurants.legalName,
      taxId: restaurants.taxId,
      timezone: restaurants.timezone,
    })
    .from(restaurants)
    .where(and(eq(restaurants.id, restaurantId), isNull(restaurants.deletedAt)))
    .get();

  return row ?? null;
}

interface UpdateRestaurantSettingsInput {
  db: DrizzleDb;
  legal: {
    dataProtectionEmail: string | null;
    legalAddress: string | null;
    legalName: string | null;
    taxId: string | null;
  };
  restaurantId: string;
  timezone: string;
}

export function updateRestaurantSettingsStatement({
  db,
  legal,
  restaurantId,
  timezone,
}: UpdateRestaurantSettingsInput): BatchItem<"sqlite"> {
  return db
    .update(restaurants)
    .set({ ...legal, timezone, updatedAt: Date.now() })
    .where(and(eq(restaurants.id, restaurantId), isNull(restaurants.deletedAt)));
}
