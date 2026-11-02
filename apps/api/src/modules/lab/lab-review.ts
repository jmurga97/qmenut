import { referralAudit, referralParticipants, referrals, restaurants } from "@qmenut/db/schema";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNull, like, ne, or, sql } from "drizzle-orm";

import { auditEntry, isUniqueViolation, listAudit, restaurantKey } from "../referrals/referral-domain";

import type { TrpcContext } from "../../trpc/context";

type Context = Pick<TrpcContext, "db"> & { staffEmail: string };
type ReferralStatus = (typeof referrals.$inferSelect)["status"];

const OPEN_STATUSES: ReferralStatus[] = ["received", "in_progress"];

const DUPLICATES = sql<number>`(
  SELECT count(*) FROM referrals d
  WHERE d.id <> ${referrals.id}
    AND (d.restaurant_key = ${referrals.restaurantKey} OR d.contact_phone = ${referrals.contactPhone})
)`;

export async function listReferrals({
  db,
  status,
  search,
}: Pick<Context, "db"> & { status: ReferralStatus | null; search: string }) {
  const pattern = `%${search.toLowerCase()}%`;
  const matches = search
    ? or(
        like(sql`lower(${referrals.restaurantName})`, pattern),
        like(referralParticipants.email, pattern),
        like(referrals.contactPhone, `%${search}%`),
      )
    : undefined;

  return db
    .select({
      id: referrals.id,
      restaurantName: referrals.restaurantName,
      city: referrals.city,
      status: referrals.status,
      payoutStatus: referrals.payoutStatus,
      rewardCents: referrals.rewardCents,
      createdAt: referrals.createdAt,
      participantName: referralParticipants.name,
      participantEmail: referralParticipants.email,
      duplicates: DUPLICATES,
    })
    .from(referrals)
    .innerJoin(referralParticipants, eq(referralParticipants.id, referrals.participantId))
    .where(and(status ? eq(referrals.status, status) : undefined, matches))
    .orderBy(desc(referrals.createdAt))
    .limit(500)
    .all();
}

export async function getReferral({ db, referralId }: Pick<Context, "db"> & { referralId: string }) {
  const row = await db
    .select({ referral: referrals, participant: referralParticipants, linkedRestaurantName: restaurants.name })
    .from(referrals)
    .innerJoin(referralParticipants, eq(referralParticipants.id, referrals.participantId))
    .leftJoin(restaurants, eq(restaurants.id, referrals.restaurantId))
    .where(eq(referrals.id, referralId))
    .get();
  if (!row) throw new TRPCError({ code: "NOT_FOUND" });

  const { referral } = row;
  const sameRestaurant = or(
    eq(referrals.restaurantKey, referral.restaurantKey),
    eq(referrals.contactPhone, referral.contactPhone),
  );
  const otherIntroductions = and(ne(referrals.id, referralId), sameRestaurant);
  const [duplicates, history] = await Promise.all([
    db
      .select({
        id: referrals.id,
        restaurantName: referrals.restaurantName,
        status: referrals.status,
        createdAt: referrals.createdAt,
        participantEmail: referralParticipants.email,
      })
      .from(referrals)
      .innerJoin(referralParticipants, eq(referralParticipants.id, referrals.participantId))
      .where(otherIntroductions)
      .orderBy(referrals.createdAt)
      .all(),
    listAudit({ db, entityType: "referral", entityId: referralId }),
  ]);

  return {
    ...row,
    duplicates,
    history,
    // The earliest introduction of the same restaurant has priority.
    isFirstIntroduction: duplicates.every((duplicate) => duplicate.createdAt >= referral.createdAt),
  };
}

/** QMenut restaurants to link, with whether one of their branches is on Business. */
export async function searchRestaurants({ db, query }: Pick<Context, "db"> & { query: string }) {
  const key = restaurantKey(query);
  if (!key) return [];
  const nameMatches = like(sql`lower(${restaurants.name})`, `%${query.trim().toLowerCase()}%`);

  return (
    db
      .select({
        id: restaurants.id,
        name: restaurants.name,
        hasBusiness: sql<number>`EXISTS (
        SELECT 1 FROM branch_subscriptions s
        WHERE s.restaurant_id = ${restaurants.id} AND s.plan_code = 'business' AND s.status IN ('active', 'trialing')
      )`,
      })
      .from(restaurants)
      // ponytail: substring match on the raw name; add a stored key column if names with accents stop matching.
      .where(and(isNull(restaurants.deletedAt), nameMatches))
      .limit(20)
      .all()
  );
}

async function transition({
  db,
  staffEmail,
  referralId,
  from,
  unpaidOnly = false,
  set,
  action,
  details,
}: Context & {
  referralId: string;
  from: ReferralStatus[];
  unpaidOnly?: boolean;
  set: Partial<typeof referrals.$inferInsert>;
  action: string;
  details?: unknown;
}) {
  const updated = await db
    .update(referrals)
    .set({ ...set, updatedAt: Date.now() })
    .where(
      and(
        eq(referrals.id, referralId),
        inArray(referrals.status, from),
        unpaidOnly ? eq(referrals.payoutStatus, "unpaid") : undefined,
      ),
    )
    .returning({ id: referrals.id })
    .get()
    .catch((error: unknown) => {
      throw isUniqueViolation(error)
        ? new TRPCError({ code: "CONFLICT", message: "Ese restaurante ya tiene una recompensa aprobada." })
        : error;
    });
  if (!updated) throw new TRPCError({ code: "CONFLICT", message: "El referido cambió de estado. Recarga la página." });

  await db
    .insert(referralAudit)
    .values(auditEntry({ entityType: "referral", entityId: referralId, action, actor: staffEmail, details }));

  return { ok: true };
}

export function markInProgress(input: Context & { referralId: string }) {
  return transition({ ...input, from: ["received"], set: { status: "in_progress" }, action: "in_progress" });
}

export function rejectReferral({ reason, ...input }: Context & { referralId: string; reason: string }) {
  return transition({
    ...input,
    from: OPEN_STATUSES,
    set: { status: "rejected", rejectionReason: reason },
    action: "rejected",
    details: { reason },
  });
}

export function approveReferral({
  restaurantId,
  paymentCents,
  paymentDate,
  paymentReference,
  ...input
}: Context & {
  referralId: string;
  restaurantId: string;
  paymentCents: number;
  paymentDate: string;
  paymentReference: string;
}) {
  return transition({
    ...input,
    from: OPEN_STATUSES,
    set: { status: "approved", restaurantId, paymentCents, paymentDate, paymentReference, approvedAt: Date.now() },
    action: "approved",
    details: { restaurantId, paymentCents, paymentDate, paymentReference },
  });
}

export async function saveNotes({
  db,
  staffEmail,
  referralId,
  notes,
}: Context & { referralId: string; notes: string }) {
  await db.batch([
    db
      .update(referrals)
      .set({ notes: notes || null, updatedAt: Date.now() })
      .where(eq(referrals.id, referralId)),
    db
      .insert(referralAudit)
      .values(auditEntry({ entityType: "referral", entityId: referralId, action: "notes", actor: staffEmail })),
  ]);

  return { ok: true };
}

export async function listPayouts({ db }: Pick<Context, "db">) {
  const rows = await db
    .select({
      id: referrals.id,
      restaurantName: referrals.restaurantName,
      rewardCents: referrals.rewardCents,
      approvedAt: referrals.approvedAt,
      payoutStatus: referrals.payoutStatus,
      payoutVesCents: referrals.payoutVesCents,
      payoutRate: referrals.payoutRate,
      payoutReference: referrals.payoutReference,
      paidAt: referrals.paidAt,
      participantName: referralParticipants.name,
      participantEmail: referralParticipants.email,
      payoutBank: referralParticipants.payoutBank,
      payoutIdNumber: referralParticipants.payoutIdNumber,
      payoutPhone: referralParticipants.payoutPhone,
    })
    .from(referrals)
    .innerJoin(referralParticipants, eq(referralParticipants.id, referrals.participantId))
    .where(eq(referrals.status, "approved"))
    .orderBy(desc(referrals.approvedAt))
    .all();

  return {
    pending: rows.filter((row) => row.payoutStatus === "unpaid"),
    paid: rows.filter((row) => row.payoutStatus === "paid").toSorted((a, b) => (b.paidAt ?? 0) - (a.paidAt ?? 0)),
  };
}

/** Guarded on `unpaid`, so a double submit or a second tab can never record a second payment. */
export function markPaid({
  vesCents,
  rate,
  reference,
  ...input
}: Context & { referralId: string; vesCents: number; rate: string; reference: string }) {
  return transition({
    ...input,
    from: ["approved"],
    unpaidOnly: true,
    set: {
      payoutStatus: "paid",
      payoutVesCents: vesCents,
      payoutRate: rate,
      payoutReference: reference,
      paidAt: Date.now(),
    },
    action: "paid",
    details: { vesCents, rate, reference },
  }).catch((error: unknown) => {
    throw error instanceof TRPCError && error.code === "CONFLICT"
      ? new TRPCError({ code: "CONFLICT", message: "Esta recompensa ya figura como pagada." })
      : error;
  });
}
