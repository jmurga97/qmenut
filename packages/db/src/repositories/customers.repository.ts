import { and, eq } from "drizzle-orm";

import { customerRestaurants, customers } from "../schema/customers";

import type { DrizzleDb } from "../client";
import type { CustomerCardState } from "../models/loyalty";

interface FindCustomerByEmailInput {
  db: DrizzleDb;
  email: string;
}

export async function findCustomerByEmail({
  db,
  email,
}: FindCustomerByEmailInput): Promise<{ email: string; id: string } | null> {
  const row = await db
    .select({ id: customers.id, email: customers.email })
    .from(customers)
    .where(eq(customers.email, email))
    .get();

  return row ?? null;
}

interface UpsertCustomerCardInput {
  db: DrizzleDb;
  email: string;
  restaurantId: string;
}

/** Idempotent: same email on any device resolves to the same card (card recovery). */
export async function upsertCustomerCard({
  db,
  email,
  restaurantId,
}: UpsertCustomerCardInput): Promise<CustomerCardState> {
  const now = Date.now();
  let customer = await findCustomerByEmail({ db, email });

  if (!customer) {
    const id = crypto.randomUUID();

    try {
      await db.insert(customers).values({ id, email, createdAt: now, updatedAt: now });
      customer = { id, email };
    } catch {
      customer = await findCustomerByEmail({ db, email });
    }
  }

  if (!customer) {
    throw new Error("Failed to create or find customer by email");
  }

  await db
    .insert(customerRestaurants)
    .values({
      customerId: customer.id,
      restaurantId,
      pointsBalance: 0,
      stampsBalance: 0,
      firstVisitAt: null,
      lastVisitAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  const state = await getCardState({ db, customerId: customer.id, restaurantId });

  if (!state) {
    throw new Error("Failed to load card state after upsert");
  }

  return state;
}

interface GetCardStateInput {
  db: DrizzleDb;
  customerId: string;
  restaurantId: string;
}

export async function getCardState({
  db,
  customerId,
  restaurantId,
}: GetCardStateInput): Promise<CustomerCardState | null> {
  const row = await db
    .select({
      customerId: customerRestaurants.customerId,
      email: customers.email,
      stampsBalance: customerRestaurants.stampsBalance,
      firstVisitAt: customerRestaurants.firstVisitAt,
      lastVisitAt: customerRestaurants.lastVisitAt,
    })
    .from(customerRestaurants)
    .innerJoin(customers, eq(customers.id, customerRestaurants.customerId))
    .where(and(eq(customerRestaurants.customerId, customerId), eq(customerRestaurants.restaurantId, restaurantId)))
    .get();

  return row ?? null;
}
