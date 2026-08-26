import { digestDeliveries, digestSchedule, restaurants, users } from "@qmenut/db/schema";
import { and, eq, gte, inArray, lt, lte, or, sql } from "drizzle-orm";

import type { DigestPeriod } from "./digest-periods";
import type { DrizzleDb } from "@qmenut/db/client";

/**
 * La entrega es at-least-once: la fila y su lease evitan envíos concurrentes, pero un crash
 * después de aceptar el email y antes de marcar `sent` puede producir un reintento.
 */

const DELIVERY_LEASE_MS = 30 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const TRANSIENT_ERROR_CODES = ["EMAIL_WORKER_UNREACHABLE", "SNAPSHOT_UNAVAILABLE", "UNEXPECTED_ERROR"] as const;

export interface DigestRecipient {
  deliveryId: string;
  email: string;
  periodEndDay: string;
  periodStartDay: string;
  restaurantId: string;
  restaurantName: string;
  userId: string;
}

export async function readDigestAnchor(db: DrizzleDb): Promise<string | null> {
  const row = await db
    .select({ anchorEndDay: digestSchedule.anchorEndDay })
    .from(digestSchedule)
    .where(eq(digestSchedule.id, 1))
    .get();

  return row?.anchorEndDay ?? null;
}

/** Avanza el calendario solo después de que las filas idempotentes del periodo existan. */
export async function advanceDigestAnchor({
  db,
  endDay,
  updatedAt,
}: {
  db: DrizzleDb;
  endDay: string;
  updatedAt: number;
}): Promise<void> {
  await db
    .insert(digestSchedule)
    .values({ id: 1, anchorEndDay: endDay, updatedAt })
    .onConflictDoUpdate({
      target: digestSchedule.id,
      set: { anchorEndDay: endDay, updatedAt },
    });
}

export async function createDeliveriesForOwners({
  db,
  period,
}: {
  db: DrizzleDb;
  period: DigestPeriod;
}): Promise<number> {
  const owners = await db.all<{ restaurant_id: string; user_id: string }>(sql`
    SELECT ru.restaurant_id, ru.user_id
    FROM restaurant_users ru
    JOIN restaurants r ON r.id = ru.restaurant_id
    WHERE ru.role_code = 'owner' AND ru.is_active = 1 AND r.deleted_at IS NULL
  `);

  let inserted = 0;

  for (let index = 0; index < owners.length; index += 18) {
    const result = await db
      .insert(digestDeliveries)
      .values(
        owners.slice(index, index + 18).map((owner) => ({
          id: crypto.randomUUID(),
          periodEndDay: period.endDay,
          periodStartDay: period.startDay,
          restaurantId: owner.restaurant_id,
          userId: owner.user_id,
        })),
      )
      .onConflictDoNothing()
      .run();
    inserted += result.meta.changes ?? 0;
  }

  return inserted;
}

function eligibleDelivery(nowMs: number) {
  return or(
    eq(digestDeliveries.status, "pending"),
    and(
      eq(digestDeliveries.status, "failed"),
      lt(digestDeliveries.attempts, MAX_ATTEMPTS),
      inArray(digestDeliveries.lastErrorCode, TRANSIENT_ERROR_CODES),
    ),
    and(
      eq(digestDeliveries.status, "sending"),
      lt(digestDeliveries.attempts, MAX_ATTEMPTS),
      lte(digestDeliveries.leaseExpiresAt, nowMs),
    ),
  );
}

/** Devuelve trabajo elegible de cualquier periodo anterior, no solo del recién creado. */
export async function listDeliveryCandidates(db: DrizzleDb, nowMs: number): Promise<DigestRecipient[]> {
  await db
    .update(digestDeliveries)
    .set({ lastErrorCode: "UNEXPECTED_ERROR", leaseExpiresAt: null, status: "failed", updatedAt: nowMs })
    .where(
      and(
        eq(digestDeliveries.status, "sending"),
        lte(digestDeliveries.leaseExpiresAt, nowMs),
        gte(digestDeliveries.attempts, MAX_ATTEMPTS),
      ),
    );

  return db
    .select({
      deliveryId: digestDeliveries.id,
      email: users.email,
      periodEndDay: digestDeliveries.periodEndDay,
      periodStartDay: digestDeliveries.periodStartDay,
      restaurantId: digestDeliveries.restaurantId,
      restaurantName: restaurants.name,
      userId: digestDeliveries.userId,
    })
    .from(digestDeliveries)
    .innerJoin(users, eq(users.id, digestDeliveries.userId))
    .innerJoin(restaurants, eq(restaurants.id, digestDeliveries.restaurantId))
    .where(eligibleDelivery(nowMs))
    .orderBy(digestDeliveries.periodEndDay, digestDeliveries.id)
    .all();
}

/** Reclama una entrega con compare-and-set; solo un cron obtiene el lease. */
export async function claimDelivery({
  db,
  deliveryId,
  nowMs,
}: {
  db: DrizzleDb;
  deliveryId: string;
  nowMs: number;
}): Promise<boolean> {
  const result = await db
    .update(digestDeliveries)
    .set({
      attempts: sql`${digestDeliveries.attempts} + 1`,
      lastErrorCode: null,
      leaseExpiresAt: nowMs + DELIVERY_LEASE_MS,
      status: "sending",
      updatedAt: nowMs,
    })
    .where(and(eq(digestDeliveries.id, deliveryId), eligibleDelivery(nowMs)))
    .run();

  return (result.meta.changes ?? 0) === 1;
}

export async function markDeliveryResult({
  db,
  deliveryId,
  errorCode,
  sentAtMs,
}: {
  db: DrizzleDb;
  deliveryId: string;
  errorCode: string | null;
  sentAtMs: number | null;
}): Promise<void> {
  await db
    .update(digestDeliveries)
    .set({
      lastErrorCode: errorCode,
      leaseExpiresAt: null,
      sentAt: sentAtMs,
      status: sentAtMs === null ? "failed" : "sent",
      updatedAt: Date.now(),
    })
    .where(and(eq(digestDeliveries.id, deliveryId), eq(digestDeliveries.status, "sending")));
}
