import { and, eq, sql } from "drizzle-orm";

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

interface FindCustomerByIdInput {
  db: DrizzleDb;
  id: string;
}

export async function findCustomerById({
  db,
  id,
}: FindCustomerByIdInput): Promise<{ email: string; id: string } | null> {
  const row = await db
    .select({ id: customers.id, email: customers.email })
    .from(customers)
    .where(eq(customers.id, id))
    .get();

  return row ?? null;
}

interface UpsertCustomerCardInput {
  consentVersion: string;
  db: DrizzleDb;
  email: string;
  restaurantId: string;
}

/** Idempotent: same email on any device resolves to the same card (card recovery). */
export async function upsertCustomerCard({
  consentVersion,
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
      loyaltyConsentAcceptedAt: now,
      loyaltyConsentVersion: consentVersion,
      firstVisitAt: null,
      lastVisitAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [customerRestaurants.customerId, customerRestaurants.restaurantId],
      set: {
        loyaltyConsentAcceptedAt: sql`
          CASE
            WHEN ${customerRestaurants.loyaltyConsentVersion} = ${consentVersion}
              AND ${customerRestaurants.loyaltyConsentAcceptedAt} IS NOT NULL
            THEN ${customerRestaurants.loyaltyConsentAcceptedAt}
            ELSE ${now}
          END
        `,
        loyaltyConsentVersion: consentVersion,
        updatedAt: now,
      },
    });

  const state = await getCardState({ db, customerId: customer.id, restaurantId });

  if (!state) {
    throw new Error("Failed to load card state after upsert");
  }

  return state;
}

interface HasCurrentLoyaltyConsentInput {
  consentVersion: string;
  db: DrizzleDb;
  customerId: string;
  restaurantId: string;
}

export async function hasCurrentLoyaltyConsent({
  consentVersion,
  db,
  customerId,
  restaurantId,
}: HasCurrentLoyaltyConsentInput): Promise<boolean> {
  const row = await db
    .select({
      loyaltyConsentAcceptedAt: customerRestaurants.loyaltyConsentAcceptedAt,
      loyaltyConsentVersion: customerRestaurants.loyaltyConsentVersion,
    })
    .from(customerRestaurants)
    .where(and(eq(customerRestaurants.customerId, customerId), eq(customerRestaurants.restaurantId, restaurantId)))
    .get();

  return row?.loyaltyConsentVersion === consentVersion && row.loyaltyConsentAcceptedAt !== null;
}

interface AcceptLoyaltyConsentInput {
  acceptedAt: number;
  consentVersion: string;
  db: DrizzleDb;
  customerId: string;
  restaurantId: string;
}

/** Stamps consent for an existing card; keeps the original acceptedAt when consent is already current. */
export async function acceptLoyaltyConsent({
  acceptedAt,
  consentVersion,
  db,
  customerId,
  restaurantId,
}: AcceptLoyaltyConsentInput): Promise<boolean> {
  const updated = await db
    .update(customerRestaurants)
    .set({
      loyaltyConsentAcceptedAt: sql`
        CASE
          WHEN ${customerRestaurants.loyaltyConsentVersion} = ${consentVersion}
            AND ${customerRestaurants.loyaltyConsentAcceptedAt} IS NOT NULL
          THEN ${customerRestaurants.loyaltyConsentAcceptedAt}
          ELSE ${acceptedAt}
        END
      `,
      loyaltyConsentVersion: consentVersion,
      updatedAt: acceptedAt,
    })
    .where(and(eq(customerRestaurants.customerId, customerId), eq(customerRestaurants.restaurantId, restaurantId)))
    .returning({ customerId: customerRestaurants.customerId });

  return updated.length > 0;
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
