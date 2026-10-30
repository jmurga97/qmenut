import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";

import { markNotificationsHandled } from "./notifications.repository";
import { users } from "../schema/auth";
import { customerRestaurants, customerVisits, customers } from "../schema/customers";
import { loyaltyRedemptions, loyaltyRewards, loyaltyStampRequests, loyaltyTransactions } from "../schema/loyalty";
import { restaurantUsers } from "../schema/restaurants";

import type { DrizzleDb } from "../client";
import type {
  CardStampRequests,
  HandledStampRequestRow,
  LoyaltyTransactionResult,
  LoyaltyTransactionType,
  PendingRedemptionRow,
  PendingStampRequestRow,
  RedemptionDetail,
} from "../models/loyalty";

interface RestaurantInput {
  db: DrizzleDb;
  restaurantId: string;
}

interface ExpireStaleRedemptionsInput {
  db: DrizzleDb;
  /** Omitted by the minute cron, which sweeps every restaurant. */
  restaurantId?: string;
  olderThanMs: number;
}

/** Lazy expiry: any read/scan touching pending redemptions calls this first. No refund — stamps only move at validation. */
export async function expireStaleRedemptions({
  db,
  restaurantId,
  olderThanMs,
}: ExpireStaleRedemptionsInput): Promise<void> {
  const now = Date.now();
  const expired = await db
    .update(loyaltyRedemptions)
    .set({ status: "expired", updatedAt: now })
    .where(
      and(
        restaurantId ? eq(loyaltyRedemptions.restaurantId, restaurantId) : undefined,
        eq(loyaltyRedemptions.status, "pending"),
        lt(loyaltyRedemptions.createdAt, now - olderThanMs),
      ),
    )
    .returning({ id: loyaltyRedemptions.id });

  await markNotificationsHandled({
    db,
    type: "loyalty.redemption",
    subjectIds: expired.map((row) => row.id),
    handledBy: null,
    outcome: "expired",
    now,
  });
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
  branchId: string;
  customerId: string;
  rewardId: string;
  cost: number;
}

export async function createRedemption({
  db,
  restaurantId,
  branchId,
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
    branchId,
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

export const STAMP_REQUEST_AUTO_ACCEPT_MS = 12 * 60 * 60 * 1000;
const STAMP_REQUEST_BATCH = 50;

interface CreateStampRequestInput extends RestaurantInput {
  customerId: string;
  branchId: string;
  quantity: number;
  cooldownMs: number;
}

/** Race-safe cooldown: one request per card per window, whatever its outcome; cancelled ones don't count. */
export async function createStampRequest({
  db,
  restaurantId,
  customerId,
  branchId,
  quantity,
  cooldownMs,
}: CreateStampRequestInput): Promise<"cooldown" | { id: string; createdAt: number }> {
  const id = crypto.randomUUID();
  const now = Date.now();

  const insert = await db.run(sql`
    INSERT INTO loyalty_stamp_requests
      (id, customer_id, restaurant_id, branch_id, claimed_quantity, status, auto_accepted, created_at, updated_at)
    SELECT ${id}, ${customerId}, ${restaurantId}, ${branchId}, ${quantity}, 'pending', 0, ${now}, ${now}
    WHERE NOT EXISTS (
      SELECT 1
      FROM loyalty_stamp_requests
      WHERE customer_id = ${customerId}
        AND restaurant_id = ${restaurantId}
        AND status <> 'cancelled'
        AND created_at >= ${now - cooldownMs}
    )
  `);

  return insert.meta.changes === 1 ? { id, createdAt: now } : "cooldown";
}

interface AcceptStampRequestInput {
  db: DrizzleDb;
  requestId: string;
  /** Omitted by the cron, which accepts every restaurant's overdue requests. */
  restaurantId?: string;
  /** Null accepts the claimed quantity. */
  quantity: number | null;
  /** Null when accepted automatically. */
  handledBy: string | null;
}

export async function acceptStampRequest({
  db,
  requestId,
  restaurantId,
  quantity,
  handledBy,
}: AcceptStampRequestInput): Promise<boolean> {
  const pending = and(
    eq(loyaltyStampRequests.id, requestId),
    restaurantId ? eq(loyaltyStampRequests.restaurantId, restaurantId) : undefined,
    eq(loyaltyStampRequests.status, "pending"),
    quantity === null ? undefined : gte(loyaltyStampRequests.claimedQuantity, quantity),
  );
  const request = await db.select().from(loyaltyStampRequests).where(pending).get();
  if (!request) return false;

  const now = Date.now();
  const points = quantity ?? request.claimedQuantity;
  const reasonCode = `stamp_request:${requestId}`;
  const stillPending = sql`EXISTS ${db.select({ id: loyaltyStampRequests.id }).from(loyaltyStampRequests).where(pending)}`;
  const earn = db.insert(loyaltyTransactions).select(sql`
    SELECT NULL, customer_id, restaurant_id, branch_id, 'earn', ${points}, ${reasonCode}, NULL, NULL, created_at
    FROM loyalty_stamp_requests WHERE ${pending}
  `);
  const balance = db
    .update(customerRestaurants)
    .set({
      stampsBalance: sql`${customerRestaurants.stampsBalance} + ${points}`,
      lastVisitAt: sql`MAX(COALESCE(${customerRestaurants.lastVisitAt}, 0), ${request.createdAt})`,
      firstVisitAt: sql`MIN(COALESCE(${customerRestaurants.firstVisitAt}, ${request.createdAt}), ${request.createdAt})`,
      updatedAt: now,
    })
    .where(
      and(
        eq(customerRestaurants.customerId, request.customerId),
        eq(customerRestaurants.restaurantId, request.restaurantId),
        stillPending,
      ),
    );
  const visit = db.insert(customerVisits).select(sql`
    SELECT NULL, customer_id, restaurant_id, branch_id, 'direct', created_at
    FROM loyalty_stamp_requests WHERE ${pending} AND branch_id IS NOT NULL
  `);
  const complete = db
    .update(loyaltyStampRequests)
    .set({
      status: "accepted",
      acceptedQuantity: points,
      autoAccepted: handledBy === null,
      handledBy,
      handledAt: now,
      updatedAt: now,
      transactionId: sql`(SELECT id FROM ${loyaltyTransactions} WHERE ${loyaltyTransactions.reasonCode} = ${reasonCode}
      AND ${loyaltyTransactions.restaurantId} = ${request.restaurantId} ORDER BY id DESC LIMIT 1)`,
      visitId:
        request.branchId === null
          ? null
          : sql`(SELECT MAX(id) FROM ${customerVisits}
      WHERE ${customerVisits.customerId} = ${request.customerId} AND ${customerVisits.restaurantId} = ${request.restaurantId}
        AND ${customerVisits.branchId} = ${request.branchId} AND ${customerVisits.createdAt} = ${request.createdAt})`,
    })
    .where(pending);

  // Every write checks pending until the last statement; a failed batch rolls the entire credit back.
  const results = await db.batch([earn, balance, visit, complete]);
  return results[3].meta.changes === 1;
}

const REOPENED_REQUEST = {
  status: "pending",
  acceptedQuantity: null,
  autoAccepted: false,
  handledBy: null,
  handledAt: null,
  outcomeSeenAt: null,
} as const;

interface DeclineStampRequestInput extends RestaurantInput {
  requestId: string;
  handledBy: string;
}

export async function declineStampRequest({
  db,
  restaurantId,
  requestId,
  handledBy,
}: DeclineStampRequestInput): Promise<boolean> {
  const now = Date.now();
  const result = await db
    .update(loyaltyStampRequests)
    .set({ status: "declined", handledBy, handledAt: now, updatedAt: now })
    .where(
      and(
        eq(loyaltyStampRequests.id, requestId),
        eq(loyaltyStampRequests.restaurantId, restaurantId),
        eq(loyaltyStampRequests.status, "pending"),
      ),
    )
    .run();

  return result.meta.changes === 1;
}

interface CancelStampRequestInput extends RestaurantInput {
  customerId: string;
  requestId: string;
}

export async function cancelStampRequest({
  db,
  restaurantId,
  customerId,
  requestId,
}: CancelStampRequestInput): Promise<boolean> {
  const now = Date.now();
  const result = await db
    .update(loyaltyStampRequests)
    .set({ status: "cancelled", handledAt: now, updatedAt: now })
    .where(
      and(
        eq(loyaltyStampRequests.id, requestId),
        eq(loyaltyStampRequests.restaurantId, restaurantId),
        eq(loyaltyStampRequests.customerId, customerId),
        eq(loyaltyStampRequests.status, "pending"),
      ),
    )
    .run();

  return result.meta.changes === 1;
}

interface AcceptOverdueStampRequestsInput {
  db: DrizzleDb;
  /** Omitted by the minute cron, which sweeps every restaurant. */
  restaurantId?: string;
  now?: number;
}

async function acceptEach(db: DrizzleDb, requests: Array<{ id: string }>): Promise<string[]> {
  const accepted: string[] = [];

  for (const { id } of requests) {
    if (await acceptStampRequest({ db, requestId: id, quantity: null, handledBy: null })) accepted.push(id);
  }

  return accepted;
}

/** ADR 0007: unanswered requests are accepted at the claimed quantity, even if the program was turned off since. */
export async function acceptOverdueStampRequests({
  db,
  restaurantId,
  now = Date.now(),
}: AcceptOverdueStampRequestsInput): Promise<void> {
  for (;;) {
    const overdue = await db
      .select({ id: loyaltyStampRequests.id })
      .from(loyaltyStampRequests)
      .where(
        and(
          restaurantId ? eq(loyaltyStampRequests.restaurantId, restaurantId) : undefined,
          eq(loyaltyStampRequests.status, "pending"),
          lt(loyaltyStampRequests.createdAt, now - STAMP_REQUEST_AUTO_ACCEPT_MS),
        ),
      )
      .orderBy(loyaltyStampRequests.createdAt)
      .limit(STAMP_REQUEST_BATCH)
      .all();

    await markNotificationsHandled({
      db,
      type: "loyalty.stampRequest",
      subjectIds: await acceptEach(db, overdue),
      handledBy: null,
      outcome: "autoAccepted",
      now,
    });

    if (overdue.length < STAMP_REQUEST_BATCH) return;
  }
}

interface StampRequestInput extends RestaurantInput {
  requestId: string;
}

/** Undo from the admin. An acceptance becomes a decline (back to pending, the cron would accept it again at once). */
export async function undoStampRequest({
  db,
  restaurantId,
  requestId,
  handledBy,
  branchId,
}: StampRequestInput & { handledBy: string; branchId: string }): Promise<
  "notFound" | "spent" | "reopened" | "declined"
> {
  const request = await db
    .select({
      status: loyaltyStampRequests.status,
      transactionId: loyaltyStampRequests.transactionId,
      visitId: loyaltyStampRequests.visitId,
      handledBy: loyaltyStampRequests.handledBy,
      handledAt: loyaltyStampRequests.handledAt,
    })
    .from(loyaltyStampRequests)
    .where(and(eq(loyaltyStampRequests.id, requestId), eq(loyaltyStampRequests.restaurantId, restaurantId)))
    .get();
  const requestFilter = (status: "accepted" | "declined") =>
    and(eq(loyaltyStampRequests.id, requestId), eq(loyaltyStampRequests.status, status));

  // A decline is reopened only if it was never accepted: an undone acceptance stays declined.
  if (request?.status === "declined" && request.transactionId === null) {
    const reopened = await db
      .update(loyaltyStampRequests)
      .set({ ...REOPENED_REQUEST, updatedAt: Date.now() })
      .where(requestFilter("declined"))
      .run();

    return reopened.meta.changes === 1 ? "reopened" : "notFound";
  }

  if (request?.status !== "accepted" || request.transactionId === null) return "notFound";

  const now = Date.now();
  const flip = await db
    .update(loyaltyStampRequests)
    .set({ status: "declined", handledBy, handledAt: now, outcomeSeenAt: null, updatedAt: now })
    .where(requestFilter("accepted"))
    .run();

  if (flip.meta.changes !== 1) return "notFound";

  const transaction = await findTransaction({ db, restaurantId, transactionId: request.transactionId });

  try {
    if (transaction && !(await hasCompensation({ db, restaurantId, transactionId: transaction.id }))) {
      await compensateTransaction({ db, restaurantId, transaction, branchId });
    }
  } catch {
    // The stamps_balance >= 0 CHECK aborted the compensation: the guest already spent them.
    await db
      .update(loyaltyStampRequests)
      .set({ status: "accepted", handledBy: request.handledBy, handledAt: request.handledAt, updatedAt: Date.now() })
      .where(requestFilter("declined"));

    return "spent";
  }

  if (request.visitId !== null) {
    await db.delete(customerVisits).where(eq(customerVisits.id, request.visitId));
  }

  return "declined";
}

interface BranchStampRequestsInput extends RestaurantInput {
  branchId: string;
}

export async function listPendingStampRequests({
  db,
  restaurantId,
  branchId,
}: BranchStampRequestsInput): Promise<PendingStampRequestRow[]> {
  return db
    .select({
      id: loyaltyStampRequests.id,
      email: customers.email,
      claimedQuantity: loyaltyStampRequests.claimedQuantity,
      createdAt: loyaltyStampRequests.createdAt,
    })
    .from(loyaltyStampRequests)
    .innerJoin(customers, eq(customers.id, loyaltyStampRequests.customerId))
    .where(
      and(
        eq(loyaltyStampRequests.restaurantId, restaurantId),
        eq(loyaltyStampRequests.branchId, branchId),
        eq(loyaltyStampRequests.status, "pending"),
      ),
    )
    .orderBy(loyaltyStampRequests.createdAt)
    .all();
}

export async function listHandledStampRequests({
  db,
  restaurantId,
  branchId,
  since,
}: BranchStampRequestsInput & { since: number }): Promise<HandledStampRequestRow[]> {
  return db
    .select({
      id: loyaltyStampRequests.id,
      email: customers.email,
      status: loyaltyStampRequests.status,
      claimedQuantity: loyaltyStampRequests.claimedQuantity,
      acceptedQuantity: loyaltyStampRequests.acceptedQuantity,
      autoAccepted: loyaltyStampRequests.autoAccepted,
      handledAt: loyaltyStampRequests.handledAt,
      handledByName: users.name,
      createdAt: loyaltyStampRequests.createdAt,
    })
    .from(loyaltyStampRequests)
    .innerJoin(customers, eq(customers.id, loyaltyStampRequests.customerId))
    .leftJoin(restaurantUsers, eq(restaurantUsers.id, loyaltyStampRequests.handledBy))
    .leftJoin(users, eq(users.id, restaurantUsers.userId))
    .where(
      and(
        eq(loyaltyStampRequests.restaurantId, restaurantId),
        eq(loyaltyStampRequests.branchId, branchId),
        inArray(loyaltyStampRequests.status, ["accepted", "declined"]),
        gte(loyaltyStampRequests.handledAt, since),
      ),
    )
    .orderBy(desc(loyaltyStampRequests.handledAt))
    .all();
}

interface CustomerStampRequestsInput extends RestaurantInput {
  customerId: string;
}

export async function getCardStampRequests({
  db,
  restaurantId,
  customerId,
}: CustomerStampRequestsInput): Promise<CardStampRequests> {
  const customerFilter = and(
    eq(loyaltyStampRequests.customerId, customerId),
    eq(loyaltyStampRequests.restaurantId, restaurantId),
  );
  const pendingQuery = db
    .select({
      id: loyaltyStampRequests.id,
      quantity: loyaltyStampRequests.claimedQuantity,
      createdAt: loyaltyStampRequests.createdAt,
    })
    .from(loyaltyStampRequests)
    .where(and(customerFilter, eq(loyaltyStampRequests.status, "pending")))
    .orderBy(loyaltyStampRequests.createdAt)
    .all();
  const latestQuery = db
    .select({
      id: loyaltyStampRequests.id,
      status: loyaltyStampRequests.status,
      claimed: loyaltyStampRequests.claimedQuantity,
      accepted: loyaltyStampRequests.acceptedQuantity,
      outcomeSeenAt: loyaltyStampRequests.outcomeSeenAt,
    })
    .from(loyaltyStampRequests)
    .where(and(customerFilter, inArray(loyaltyStampRequests.status, ["accepted", "declined"])))
    .orderBy(desc(loyaltyStampRequests.handledAt))
    .get();
  const [pending, latest] = await Promise.all([pendingQuery, latestQuery]);
  const lastOutcome =
    latest && latest.outcomeSeenAt === null && latest.status !== "pending" && latest.status !== "cancelled"
      ? { id: latest.id, status: latest.status, claimed: latest.claimed, accepted: latest.accepted ?? 0 }
      : null;

  return { pendingRequests: pending, lastOutcome };
}

export async function dismissStampOutcome({
  db,
  restaurantId,
  customerId,
  requestId,
}: CustomerStampRequestsInput & { requestId: string }): Promise<void> {
  await db
    .update(loyaltyStampRequests)
    .set({ outcomeSeenAt: Date.now() })
    .where(
      and(
        eq(loyaltyStampRequests.id, requestId),
        eq(loyaltyStampRequests.customerId, customerId),
        eq(loyaltyStampRequests.restaurantId, restaurantId),
      ),
    );
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
