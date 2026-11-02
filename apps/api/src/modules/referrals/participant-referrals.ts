import { referralAudit, referralParticipants, referrals, referralTokens } from "@qmenut/db/schema";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";

import { setSessionCookie } from "./participant-session";
import { createReferral } from "./public-referrals";
import { auditEntry, throttle } from "./referral-domain";

import type { RestaurantInput } from "./referral-domain";
import type { TrpcContext } from "../../trpc/context";

type Participant = typeof referralParticipants.$inferSelect;
type Context = Pick<TrpcContext, "db" | "env" | "request" | "resHeaders"> & { participant: Participant };

export async function getMyReferrals({ db, participant }: Context) {
  const rows = await db
    .select({
      id: referrals.id,
      restaurantName: referrals.restaurantName,
      city: referrals.city,
      status: referrals.status,
      rejectionReason: referrals.rejectionReason,
      rewardCents: referrals.rewardCents,
      payoutStatus: referrals.payoutStatus,
      createdAt: referrals.createdAt,
    })
    .from(referrals)
    .where(eq(referrals.participantId, participant.id))
    .orderBy(desc(referrals.createdAt))
    .all();
  const approved = rows.filter((row) => row.status === "approved");

  return {
    participant: {
      name: participant.name,
      email: participant.email,
      rewardCents: participant.rewardCents,
      payout: participant.payoutBank
        ? { bank: participant.payoutBank, idNumber: participant.payoutIdNumber, phone: participant.payoutPhone }
        : null,
    },
    referrals: rows,
    totals: {
      approvedCents: approved.reduce((sum, row) => sum + row.rewardCents, 0),
      paidCents: approved.filter((row) => row.payoutStatus === "paid").reduce((sum, row) => sum + row.rewardCents, 0),
    },
    // Pago Móvil details are requested only once a referral is approved.
    canSubmitPayout: approved.length > 0,
  };
}

export async function submitReferral({ db, env, participant, restaurant }: Context & { restaurant: RestaurantInput }) {
  await throttle({ env, key: `submit:${participant.id}` });

  return createReferral({ db, participant, restaurant, actor: "participant" });
}

export async function savePayoutDetails({
  db,
  participant,
  bank,
  idNumber,
  phone,
}: Context & { bank: string; idNumber: string; phone: string }) {
  const approved = await db
    .select({ id: referrals.id })
    .from(referrals)
    .where(and(eq(referrals.participantId, participant.id), eq(referrals.status, "approved")))
    .get();
  if (!approved) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Podrás cargar tus datos de pago cuando aprobemos un referido.",
    });
  }

  await db.batch([
    db
      .update(referralParticipants)
      .set({
        payoutBank: bank,
        payoutIdNumber: idNumber,
        payoutPhone: phone,
        payoutUpdatedAt: Date.now(),
        updatedAt: Date.now(),
      })
      .where(eq(referralParticipants.id, participant.id)),
    db.insert(referralAudit).values(
      auditEntry({
        entityType: "participant",
        entityId: participant.id,
        action: "payout_details",
        actor: "participant",
      }),
    ),
  ]);

  return { ok: true };
}

export async function signOut({ db, request, resHeaders, sessionHash }: Context & { sessionHash: string }) {
  await db.delete(referralTokens).where(eq(referralTokens.hash, sessionHash));
  setSessionCookie({ request, resHeaders, secret: null });

  return { ok: true };
}
