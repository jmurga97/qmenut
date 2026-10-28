import { eq } from "drizzle-orm";

import { restaurantStripeAccounts } from "../schema/restaurants";

import type { DrizzleDb } from "../client";

export type StripeAccountStatus = (typeof restaurantStripeAccounts.$inferSelect)["status"];

export interface RestaurantStripeAccountRow {
  stripeAccountId: string;
  status: StripeAccountStatus;
}

interface RestaurantScopeInput {
  db: DrizzleDb;
  restaurantId: string;
}

/** The restaurant's Connect account: charge on its behalf with `{ stripeAccount: stripeAccountId }`. */
export async function getRestaurantStripeAccount({
  db,
  restaurantId,
}: RestaurantScopeInput): Promise<RestaurantStripeAccountRow | null> {
  const row = await db
    .select({ stripeAccountId: restaurantStripeAccounts.stripeAccountId, status: restaurantStripeAccounts.status })
    .from(restaurantStripeAccounts)
    .where(eq(restaurantStripeAccounts.restaurantId, restaurantId))
    .get();

  return row ?? null;
}

interface InsertRestaurantStripeAccountInput extends RestaurantScopeInput {
  stripeAccountId: string;
}

export async function insertRestaurantStripeAccount({
  db,
  restaurantId,
  stripeAccountId,
}: InsertRestaurantStripeAccountInput): Promise<RestaurantStripeAccountRow> {
  const now = Date.now();
  await db
    .insert(restaurantStripeAccounts)
    .values({ restaurantId, stripeAccountId, status: "pending", createdAt: now, updatedAt: now })
    .onConflictDoNothing();

  const persisted = await getRestaurantStripeAccount({ db, restaurantId });

  if (!persisted) {
    throw new Error("Failed to persist or load Stripe account");
  }

  return persisted;
}

interface UpdateRestaurantStripeAccountStatusInput extends RestaurantScopeInput {
  status: StripeAccountStatus;
}

export async function updateRestaurantStripeAccountStatus({
  db,
  restaurantId,
  status,
}: UpdateRestaurantStripeAccountStatusInput): Promise<void> {
  await db
    .update(restaurantStripeAccounts)
    .set({ status, updatedAt: Date.now() })
    .where(eq(restaurantStripeAccounts.restaurantId, restaurantId));
}

export async function deleteRestaurantStripeAccount({ db, restaurantId }: RestaurantScopeInput): Promise<void> {
  await db.delete(restaurantStripeAccounts).where(eq(restaurantStripeAccounts.restaurantId, restaurantId));
}
