import { and, eq, lt, sql } from "drizzle-orm";

import { customerRestaurants, customerVisits, customers } from "../schema/customers";
import { loyaltyRedemptions, loyaltyRewards, loyaltyTransactions } from "../schema/loyalty";

import type { DrizzleDb } from "../client";
import type {
  LoyaltyTransactionResult,
  LoyaltyTransactionType,
  PendingRedemptionRow,
  RedemptionDetail,
} from "../models/loyalty";

interface RestaurantInput {
  db: DrizzleDb;
  restaurantId: string;
}

interface ExpireStaleRedemptionsInput extends RestaurantInput {
  olderThanMs: number;
}

/** Lazy expiry: any read/scan touching pending redemptions calls this first. No refund — stamps only move at validation. */
export async function expireStaleRedemptions({
  db,
  restaurantId,
  olderThanMs,
}: ExpireStaleRedemptionsInput): Promise<void> {
  const cutoff = Date.now() - olderThanMs;

  await db
    .update(loyaltyRedemptions)
    .set({ status: "expired", updatedAt: Date.now() })
    .where(
      and(
        eq(loyaltyRedemptions.restaurantId, restaurantId),
        eq(loyaltyRedemptions.status, "pending"),
        lt(loyaltyRedemptions.createdAt, cutoff),
      ),
    );
}

const redemptionDetailColumns = {
  id: loyaltyRedemptions.id,
  customerId: loyaltyRedemptions.customerId,
  rewardId: loyaltyRedemptions.rewardId,
  rewardName: loyaltyRewards.name,
  cost: loyaltyRedemptions.cost,
  status: loyaltyRedemptions.status,
  createdAt: loyaltyRedemptions.createdAt,
  validatedAt: loyaltyRedemptions.validatedAt,
};

interface GetRedemptionInput extends RestaurantInput {
  redemptionId: string;
}

/** Joins the reward without a deleted filter — a soft-deleted reward must still render for an in-flight redemption. */
export async function getRedemption({
  db,
  restaurantId,
  redemptionId,
}: GetRedemptionInput): Promise<RedemptionDetail | null> {
  const row = await db
    .select(redemptionDetailColumns)
    .from(loyaltyRedemptions)
    .innerJoin(loyaltyRewards, eq(loyaltyRewards.id, loyaltyRedemptions.rewardId))
    .where(and(eq(loyaltyRedemptions.id, redemptionId), eq(loyaltyRedemptions.restaurantId, restaurantId)))
    .get();

  return row ?? null;
}

interface FindPendingRedemptionInput extends RestaurantInput {
  customerId: string;
}

export async function findPendingRedemption({
  db,
  restaurantId,
  customerId,
}: FindPendingRedemptionInput): Promise<RedemptionDetail | null> {
  const row = await db
    .select(redemptionDetailColumns)
    .from(loyaltyRedemptions)
    .innerJoin(loyaltyRewards, eq(loyaltyRewards.id, loyaltyRedemptions.rewardId))
    .where(
      and(
        eq(loyaltyRedemptions.restaurantId, restaurantId),
        eq(loyaltyRedemptions.customerId, customerId),
        eq(loyaltyRedemptions.status, "pending"),
      ),
    )
    .get();

  return row ?? null;
}

interface CreateRedemptionInput extends RestaurantInput {
  customerId: string;
  rewardId: string;
  cost: number;
}

export async function createRedemption({
  db,
  restaurantId,
  customerId,
  rewardId,
  cost,
}: CreateRedemptionInput): Promise<string> {
  const id = crypto.randomUUID();
  const now = Date.now();

  await db.insert(loyaltyRedemptions).values({
    id,
    customerId,
    restaurantId,
    branchId: null,
    rewardId,
    cost,
    status: "pending",
    validatedBy: null,
    validatedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  return id;
}

interface CancelRedemptionInput extends RestaurantInput {
  customerId: string;
  redemptionId: string;
}

export async function cancelRedemption({
  db,
  restaurantId,
  customerId,
  redemptionId,
}: CancelRedemptionInput): Promise<boolean> {
  const result = await db
    .update(loyaltyRedemptions)
    .set({ status: "rejected", updatedAt: Date.now() })
    .where(
      and(
        eq(loyaltyRedemptions.id, redemptionId),
        eq(loyaltyRedemptions.restaurantId, restaurantId),
        eq(loyaltyRedemptions.customerId, customerId),
        eq(loyaltyRedemptions.status, "pending"),
      ),
    )
    .run();

  return result.meta.changes === 1;
}

interface RejectRedemptionInput extends RestaurantInput {
  redemptionId: string;
}

/** Staff-side rejection from the pending list — unlike cancelRedemption, not scoped to a customer. */
export async function rejectRedemption({ db, restaurantId, redemptionId }: RejectRedemptionInput): Promise<boolean> {
  const result = await db
    .update(loyaltyRedemptions)
    .set({ status: "rejected", updatedAt: Date.now() })
    .where(
      and(
        eq(loyaltyRedemptions.id, redemptionId),
        eq(loyaltyRedemptions.restaurantId, restaurantId),
        eq(loyaltyRedemptions.status, "pending"),
      ),
    )
    .run();

  return result.meta.changes === 1;
}

export async function listPendingRedemptions({ db, restaurantId }: RestaurantInput): Promise<PendingRedemptionRow[]> {
  return db
    .select({ ...redemptionDetailColumns, email: customers.email })
    .from(loyaltyRedemptions)
    .innerJoin(loyaltyRewards, eq(loyaltyRewards.id, loyaltyRedemptions.rewardId))
    .innerJoin(customers, eq(customers.id, loyaltyRedemptions.customerId))
    .where(and(eq(loyaltyRedemptions.restaurantId, restaurantId), eq(loyaltyRedemptions.status, "pending")))
    .orderBy(loyaltyRedemptions.createdAt)
    .all();
}

interface AddStampInput extends RestaurantInput {
  customerId: string;
  branchId: string;
  cooldownMs: number;
}

export async function addStamp({
  db,
  restaurantId,
  customerId,
  branchId,
  cooldownMs,
}: AddStampInput): Promise<"cooldown" | LoyaltyTransactionResult> {
  const now = Date.now();
  const cutoff = now - cooldownMs;
  const customerRestaurantFilter = and(
    eq(customerRestaurants.customerId, customerId),
    eq(customerRestaurants.restaurantId, restaurantId),
  );

  const insert = await db.run(sql`
    INSERT INTO loyalty_transactions
      (customer_id, restaurant_id, branch_id, type, points, reason_code, created_at)
    SELECT ${customerId}, ${restaurantId}, ${branchId}, 'earn', 1, 'venue_code', ${now}
    WHERE NOT EXISTS (
      SELECT 1
      FROM loyalty_transactions
      WHERE customer_id = ${customerId}
        AND restaurant_id = ${restaurantId}
        AND type = 'earn'
        AND created_at >= ${cutoff}
    )
  `);

  if (insert.meta.changes !== 1) {
    return "cooldown";
  }

  await db.batch([
    db
      .update(customerRestaurants)
      .set({
        stampsBalance: sql`${customerRestaurants.stampsBalance} + 1`,
        lastVisitAt: now,
        firstVisitAt: sql`COALESCE(${customerRestaurants.firstVisitAt}, ${now})`,
        updatedAt: now,
      })
      .where(customerRestaurantFilter),
    db.insert(customerVisits).values({ customerId, restaurantId, branchId, source: "direct", createdAt: now }),
  ]);

  const balanceRow = await db
    .select({ stampsBalance: customerRestaurants.stampsBalance })
    .from(customerRestaurants)
    .where(customerRestaurantFilter)
    .get();

  return { transactionId: Number(insert.meta.last_row_id), newBalance: balanceRow?.stampsBalance ?? 0 };
}

interface ValidateRedemptionInput extends RestaurantInput {
  redemptionId: string;
  branchId: string;
  validatedBy: string;
}

export async function validateRedemption({
  db,
  restaurantId,
  redemptionId,
  branchId,
  validatedBy,
}: ValidateRedemptionInput): Promise<"conflict" | LoyaltyTransactionResult> {
  const now = Date.now();

  const flip = await db
    .update(loyaltyRedemptions)
    .set({ status: "validated", validatedBy, validatedAt: now, branchId, updatedAt: now })
    .where(
      and(
        eq(loyaltyRedemptions.id, redemptionId),
        eq(loyaltyRedemptions.restaurantId, restaurantId),
        eq(loyaltyRedemptions.status, "pending"),
      ),
    )
    .run();

  if (flip.meta.changes !== 1) {
    return "conflict";
  }

  const redemption = await db
    .select({
      customerId: loyaltyRedemptions.customerId,
      cost: loyaltyRedemptions.cost,
    })
    .from(loyaltyRedemptions)
    .where(and(eq(loyaltyRedemptions.id, redemptionId), eq(loyaltyRedemptions.restaurantId, restaurantId)))
    .get();

  if (!redemption) {
    await db
      .update(loyaltyRedemptions)
      .set({ status: "pending", validatedBy: null, validatedAt: null, updatedAt: Date.now() })
      .where(eq(loyaltyRedemptions.id, redemptionId));

    return "conflict";
  }

  try {
    const redemptionCustomerFilter = and(
      eq(customerRestaurants.customerId, redemption.customerId),
      eq(customerRestaurants.restaurantId, restaurantId),
    );

    const [txResult] = await db.batch([
      db.insert(loyaltyTransactions).values({
        customerId: redemption.customerId,
        restaurantId,
        branchId,
        type: "redeem",
        points: -redemption.cost,
        reasonCode: "reward_redemption",
        orderId: null,
        redemptionId,
        createdAt: now,
      }),
      db
        .update(customerRestaurants)
        .set({ stampsBalance: sql`${customerRestaurants.stampsBalance} - ${redemption.cost}`, updatedAt: now })
        .where(redemptionCustomerFilter),
    ]);

    const balanceRow = await db
      .select({ stampsBalance: customerRestaurants.stampsBalance })
      .from(customerRestaurants)
      .where(redemptionCustomerFilter)
      .get();

    return { transactionId: Number(txResult.meta.last_row_id), newBalance: balanceRow?.stampsBalance ?? 0 };
  } catch {
    // The stamps_balance >= 0 CHECK aborted the batch (balance dropped below cost meanwhile).
    await db
      .update(loyaltyRedemptions)
      .set({ status: "pending", validatedBy: null, validatedAt: null, updatedAt: Date.now() })
      .where(eq(loyaltyRedemptions.id, redemptionId));

    return "conflict";
  }
}

interface FindTransactionInput extends RestaurantInput {
  transactionId: number;
}

export interface TransactionRow {
  id: number;
  customerId: string;
  branchId: string | null;
  type: LoyaltyTransactionType;
  points: number;
  redemptionId: string | null;
}

export async function findTransaction({
  db,
  restaurantId,
  transactionId,
}: FindTransactionInput): Promise<TransactionRow | null> {
  const row = await db
    .select({
      id: loyaltyTransactions.id,
      customerId: loyaltyTransactions.customerId,
      branchId: loyaltyTransactions.branchId,
      type: loyaltyTransactions.type,
      points: loyaltyTransactions.points,
      redemptionId: loyaltyTransactions.redemptionId,
    })
    .from(loyaltyTransactions)
    .where(and(eq(loyaltyTransactions.id, transactionId), eq(loyaltyTransactions.restaurantId, restaurantId)))
    .get();

  return row ?? null;
}

interface HasCompensationInput extends RestaurantInput {
  transactionId: number;
}

export async function hasCompensation({ db, restaurantId, transactionId }: HasCompensationInput): Promise<boolean> {
  const row = await db
    .select({ id: loyaltyTransactions.id })
    .from(loyaltyTransactions)
    .where(
      and(
        eq(loyaltyTransactions.restaurantId, restaurantId),
        eq(loyaltyTransactions.reasonCode, `undo:${transactionId}`),
      ),
    )
    .get();

  return row !== undefined;
}

interface CompensateTransactionInput extends RestaurantInput {
  transaction: TransactionRow;
  branchId: string;
}

/** Undo an earn (stamps -1) or a redeem (stamps back, redemption -> rejected). Idempotent via reason_code. */
export async function compensateTransaction({
  db,
  restaurantId,
  transaction,
  branchId,
}: CompensateTransactionInput): Promise<LoyaltyTransactionResult> {
  const now = Date.now();
  const reasonCode = `undo:${transaction.id}`;
  const delta = -transaction.points;

  const statements = [
    db.insert(loyaltyTransactions).values({
      customerId: transaction.customerId,
      restaurantId,
      branchId,
      type: "adjust",
      points: delta,
      reasonCode,
      orderId: null,
      redemptionId: transaction.redemptionId,
      createdAt: now,
    }),
    db
      .update(customerRestaurants)
      .set({ stampsBalance: sql`${customerRestaurants.stampsBalance} + ${delta}`, updatedAt: now })
      .where(
        and(
          eq(customerRestaurants.customerId, transaction.customerId),
          eq(customerRestaurants.restaurantId, restaurantId),
        ),
      ),
  ] as const;

  const [txResult] = transaction.redemptionId
    ? await db.batch([
        ...statements,
        db
          .update(loyaltyRedemptions)
          .set({ status: "rejected", updatedAt: now })
          .where(eq(loyaltyRedemptions.id, transaction.redemptionId)),
      ])
    : await db.batch(statements);

  const balanceRow = await db
    .select({ stampsBalance: customerRestaurants.stampsBalance })
    .from(customerRestaurants)
    .where(
      and(
        eq(customerRestaurants.customerId, transaction.customerId),
        eq(customerRestaurants.restaurantId, restaurantId),
      ),
    )
    .get();

  return { transactionId: Number(txResult.meta.last_row_id), newBalance: balanceRow?.stampsBalance ?? 0 };
}
