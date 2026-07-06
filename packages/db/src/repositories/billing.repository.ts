import { and, eq } from "drizzle-orm";

import { stripeCustomers } from "../schema/billing";
import { branches } from "../schema/branches";
import { branchSubscriptions } from "../schema/restaurants";

import type { DrizzleDb } from "../client";

export type PlanCode = "basic" | "business";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";

export interface BranchSubscriptionRow {
  branchId: string;
  planCode: PlanCode;
  status: SubscriptionStatus;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: number | null;
}

interface GetStripeCustomerInput {
  db: DrizzleDb;
  restaurantId: string;
}

export async function getStripeCustomer({
  db,
  restaurantId,
}: GetStripeCustomerInput): Promise<{ stripeCustomerId: string } | null> {
  const row = await db
    .select({ stripeCustomerId: stripeCustomers.stripeCustomerId })
    .from(stripeCustomers)
    .where(eq(stripeCustomers.restaurantId, restaurantId))
    .get();

  return row ?? null;
}

interface InsertStripeCustomerInput {
  db: DrizzleDb;
  restaurantId: string;
  stripeCustomerId: string;
}

export async function insertStripeCustomer({
  db,
  restaurantId,
  stripeCustomerId,
}: InsertStripeCustomerInput): Promise<void> {
  const now = Date.now();
  await db.insert(stripeCustomers).values({ restaurantId, stripeCustomerId, createdAt: now, updatedAt: now });
}

interface ListBranchSubscriptionsInput {
  db: DrizzleDb;
  restaurantId: string;
}

export async function listBranchSubscriptions({
  db,
  restaurantId,
}: ListBranchSubscriptionsInput): Promise<BranchSubscriptionRow[]> {
  return db
    .select({
      branchId: branchSubscriptions.branchId,
      planCode: branchSubscriptions.planCode,
      status: branchSubscriptions.status,
      stripeSubscriptionId: branchSubscriptions.stripeSubscriptionId,
      stripePriceId: branchSubscriptions.stripePriceId,
      cancelAtPeriodEnd: branchSubscriptions.cancelAtPeriodEnd,
      currentPeriodEnd: branchSubscriptions.currentPeriodEnd,
    })
    .from(branchSubscriptions)
    .where(eq(branchSubscriptions.restaurantId, restaurantId))
    .all();
}

interface GetBranchSubscriptionInput {
  db: DrizzleDb;
  restaurantId: string;
  branchId: string;
}

export async function getBranchSubscription({
  db,
  restaurantId,
  branchId,
}: GetBranchSubscriptionInput): Promise<BranchSubscriptionRow | null> {
  const row = await db
    .select({
      branchId: branchSubscriptions.branchId,
      planCode: branchSubscriptions.planCode,
      status: branchSubscriptions.status,
      stripeSubscriptionId: branchSubscriptions.stripeSubscriptionId,
      stripePriceId: branchSubscriptions.stripePriceId,
      cancelAtPeriodEnd: branchSubscriptions.cancelAtPeriodEnd,
      currentPeriodEnd: branchSubscriptions.currentPeriodEnd,
    })
    .from(branchSubscriptions)
    .where(and(eq(branchSubscriptions.restaurantId, restaurantId), eq(branchSubscriptions.branchId, branchId)))
    .get();

  return row ?? null;
}

export interface UpsertBranchSubscriptionData {
  restaurantId: string;
  branchId: string;
  planCode: PlanCode;
  status: SubscriptionStatus;
  stripeSubscriptionId: string;
  stripePriceId: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: number | null;
}

interface UpsertBranchSubscriptionInput {
  db: DrizzleDb;
  data: UpsertBranchSubscriptionData;
}

/** Upsert por branch_id: la webhook siempre escribe el último estado de Stripe (idempotente). */
export async function upsertBranchSubscription({ db, data }: UpsertBranchSubscriptionInput): Promise<void> {
  const now = Date.now();

  await db
    .insert(branchSubscriptions)
    .values({
      id: crypto.randomUUID(),
      restaurantId: data.restaurantId,
      branchId: data.branchId,
      planCode: data.planCode,
      status: data.status,
      stripeSubscriptionId: data.stripeSubscriptionId,
      stripePriceId: data.stripePriceId,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd,
      currentPeriodEnd: data.currentPeriodEnd,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: branchSubscriptions.branchId,
      set: {
        planCode: data.planCode,
        status: data.status,
        stripeSubscriptionId: data.stripeSubscriptionId,
        stripePriceId: data.stripePriceId,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd,
        currentPeriodEnd: data.currentPeriodEnd,
        updatedAt: now,
      },
    });
}

interface UpdateBranchPlanInput {
  db: DrizzleDb;
  restaurantId: string;
  branchId: string;
  planCode: PlanCode;
}

/** Mantiene branches.plan_code sincronizado con la suscripción activa. */
export async function updateBranchPlan({ db, restaurantId, branchId, planCode }: UpdateBranchPlanInput): Promise<void> {
  await db
    .update(branches)
    .set({ planCode, updatedAt: Date.now() })
    .where(and(eq(branches.id, branchId), eq(branches.restaurantId, restaurantId)));
}
