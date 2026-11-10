import { INTERNAL_SUPPORT_ACCOUNTS } from "@qmenut/permissions";
import { and, count, desc, eq, gt, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";

import { users } from "../schema/auth";
import { branches } from "../schema/branches";
import { branchSubscriptions, restaurantLanguages, restaurants, restaurantUsers } from "../schema/restaurants";

import type { DrizzleDb } from "../client";
import type { PlanCode } from "@qmenut/permissions";
import type { BatchItem } from "drizzle-orm/batch";

// Self-serve demos and staff-activated plans share one shape: no Stripe subscription and an end date in
// `current_period_end`. Ops-created trials have no end date and never expire.

export async function isHostTaken({ db, host }: { db: DrizzleDb; host: string }): Promise<boolean> {
  const row = await db.select({ id: branches.id }).from(branches).where(eq(branches.customDomain, host)).get();
  return Boolean(row);
}

export async function hasAnyMembership({ db, userId }: { db: DrizzleDb; userId: string }): Promise<boolean> {
  const row = await db
    .select({ id: restaurantUsers.id })
    .from(restaurantUsers)
    .where(eq(restaurantUsers.userId, userId))
    .get();
  return Boolean(row);
}

export interface CreateTrialTenantInput {
  db: DrizzleDb;
  owner: { userId: string; phone: string; marketingConsent: boolean };
  restaurant: { name: string; countryCode: string; sourceCurrency: string; timezone: string };
  host: string;
  trialEndsAt: number;
}

/** Same rows as `qmenut-ops create-tenant`, minus menu content: a Business trial with an end date. */
export async function createTrialTenant({
  db,
  owner,
  restaurant,
  host,
  trialEndsAt,
}: CreateTrialTenantInput): Promise<{ restaurantId: string; branchId: string }> {
  const now = Date.now();
  const restaurantId = crypto.randomUUID();
  const branchId = crypto.randomUUID();
  const supportEmails = INTERNAL_SUPPORT_ACCOUNTS.map((account) => account.email);
  const supportUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(sql`lower(${users.email})`, supportEmails))
    .all();

  const statements: [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] = [
    db
      .update(users)
      .set({ phone: owner.phone, marketingConsentAt: owner.marketingConsent ? now : null })
      .where(eq(users.id, owner.userId)),
    db.insert(restaurants).values({ id: restaurantId, ...restaurant, createdAt: now, updatedAt: now }),
    db.insert(restaurantLanguages).values({ restaurantId, languageCode: "es", createdAt: now }),
    db.insert(restaurantUsers).values({
      id: crypto.randomUUID(),
      restaurantId,
      userId: owner.userId,
      roleCode: "owner",
      createdAt: now,
      updatedAt: now,
    }),
    db.insert(branches).values({
      id: branchId,
      restaurantId,
      name: restaurant.name,
      customDomain: host,
      planCode: "business",
      createdAt: now,
      updatedAt: now,
    }),
    db.insert(branchSubscriptions).values({
      id: crypto.randomUUID(),
      restaurantId,
      branchId,
      planCode: "business",
      status: "trialing",
      currentPeriodEnd: trialEndsAt,
      createdAt: now,
      updatedAt: now,
    }),
  ];
  for (const support of supportUsers) {
    statements.push(
      db.insert(restaurantUsers).values({
        id: crypto.randomUUID(),
        restaurantId,
        userId: support.id,
        roleCode: "admin",
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  await db.batch(statements);
  return { restaurantId, branchId };
}

export async function countFounders(db: DrizzleDb): Promise<number> {
  const row = await db
    .select({ value: count() })
    .from(branchSubscriptions)
    .where(eq(branchSubscriptions.founder, true))
    .get();
  return row?.value ?? 0;
}

// The first owner of the restaurant; demos have exactly one.
const ownerField = <T>(column: typeof users.email | typeof users.name | typeof users.phone) => sql<T>`(
  SELECT ${column} FROM ${restaurantUsers} JOIN ${users} ON ${users.id} = ${restaurantUsers.userId}
  WHERE ${restaurantUsers.restaurantId} = ${branchSubscriptions.restaurantId} AND ${restaurantUsers.roleCode} = 'owner'
  ORDER BY ${restaurantUsers.createdAt} LIMIT 1
)`;

const subscriptionRow = {
  restaurantId: branchSubscriptions.restaurantId,
  branchId: branchSubscriptions.branchId,
  restaurantName: restaurants.name,
  countryCode: restaurants.countryCode,
  host: branches.customDomain,
  isActive: branches.isActive,
  planCode: branchSubscriptions.planCode,
  status: branchSubscriptions.status,
  endsAt: branchSubscriptions.currentPeriodEnd,
  founder: branchSubscriptions.founder,
  hasStripe: sql<boolean>`${branchSubscriptions.stripeSubscriptionId} IS NOT NULL`.mapWith(Boolean),
  ownerEmail: ownerField<string | null>(users.email),
  ownerName: ownerField<string | null>(users.name),
  ownerPhone: ownerField<string | null>(users.phone),
  createdAt: branchSubscriptions.createdAt,
};

export type SubscriptionListRow = Awaited<ReturnType<typeof listSubscriptions>>[number];

// ponytail: whole table, newest first; paginate past a few thousand restaurants.
export async function listSubscriptions(db: DrizzleDb) {
  return db
    .select(subscriptionRow)
    .from(branchSubscriptions)
    .innerJoin(branches, eq(branches.id, branchSubscriptions.branchId))
    .innerJoin(restaurants, eq(restaurants.id, branchSubscriptions.restaurantId))
    .where(and(isNull(branches.deletedAt), isNull(restaurants.deletedAt)))
    .orderBy(desc(branchSubscriptions.createdAt))
    .all();
}

/** Subscriptions we bill outside Stripe (demos and staff-activated plans) whose end date falls in (after, until]. */
export async function listManualSubscriptionsEnding({
  db,
  after,
  until,
}: {
  db: DrizzleDb;
  after: number;
  until: number;
}) {
  return db
    .select(subscriptionRow)
    .from(branchSubscriptions)
    .innerJoin(branches, eq(branches.id, branchSubscriptions.branchId))
    .innerJoin(restaurants, eq(restaurants.id, branchSubscriptions.restaurantId))
    .where(
      and(
        isNull(branchSubscriptions.stripeSubscriptionId),
        inArray(branchSubscriptions.status, ["trialing", "active"]),
        isNotNull(branchSubscriptions.currentPeriodEnd),
        gt(branchSubscriptions.currentPeriodEnd, after),
        lte(branchSubscriptions.currentPeriodEnd, until),
        isNull(branches.deletedAt),
      ),
    )
    .all();
}

export interface ManualSubscriptionData {
  restaurantId: string;
  branchId: string;
  planCode: PlanCode;
  status: "trialing" | "active" | "canceled";
  endsAt: number | null;
  founder?: boolean;
}

/** Writes a subscription billed outside Stripe; clears any old Stripe link so the cron owns its end date. */
export function upsertManualSubscriptionStatement({ db, data }: { db: DrizzleDb; data: ManualSubscriptionData }) {
  const now = Date.now();
  const values = {
    planCode: data.planCode,
    status: data.status,
    currentPeriodEnd: data.endsAt,
    stripeSubscriptionId: null,
    stripePriceId: null,
    cancelAtPeriodEnd: false,
    ...(data.founder === undefined ? {} : { founder: data.founder }),
    updatedAt: now,
  };
  return db
    .insert(branchSubscriptions)
    .values({
      id: crypto.randomUUID(),
      restaurantId: data.restaurantId,
      branchId: data.branchId,
      ...values,
      createdAt: now,
    })
    .onConflictDoUpdate({ target: branchSubscriptions.branchId, set: values });
}

/** Public menu on or off; an expired demo or unpaid plan goes dark but keeps every row. */
export function setBranchActiveStatement({
  db,
  restaurantId,
  branchId,
  isActive,
}: {
  db: DrizzleDb;
  restaurantId: string;
  branchId: string;
  isActive: boolean;
}): BatchItem<"sqlite"> {
  return db
    .update(branches)
    .set({ isActive, updatedAt: Date.now() })
    .where(and(eq(branches.id, branchId), eq(branches.restaurantId, restaurantId)));
}
