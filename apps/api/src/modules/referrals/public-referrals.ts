import { referralAudit, referralParticipants, referralRecipients, referrals, referralTokens } from "@qmenut/db/schema";
import { TRPCError } from "@trpc/server";
import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { SESSION_TTL_MS, setSessionCookie } from "./participant-session";
import { sendAccessLink } from "./referral-delivery";
import {
  PUBLIC_REWARD_CENTS,
  auditEntry,
  clientIp,
  hashSecret,
  newSecret,
  restaurantInputSchema,
  restaurantKey,
  throttle,
} from "./referral-domain";

import type { RestaurantInput } from "./referral-domain";
import type { TrpcContext } from "../../trpc/context";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const ACCESS_TTL_MS = 60 * 60 * 1000;

const verifyPayloadSchema = z.object({
  name: z.string(),
  phone: z.string(),
  restaurant: restaurantInputSchema,
});

type Context = Pick<TrpcContext, "db" | "env" | "request" | "resHeaders">;

/** Invitation offer for the landing page. A query that changes nothing: email scanners open links. */
export async function getOffer({ db, code }: Pick<Context, "db"> & { code: string | null }) {
  const recipient = code
    ? await db
        .select({ rewardCents: referralRecipients.rewardCents })
        .from(referralRecipients)
        .where(eq(referralRecipients.id, code))
        .get()
    : undefined;

  return { invited: Boolean(recipient), rewardCents: recipient?.rewardCents ?? PUBLIC_REWARD_CENTS };
}

/** Browser visit to an invitation link, counted apart from Instantly's provider clicks. */
export async function recordVisit({ db, code }: Pick<Context, "db"> & { code: string }): Promise<void> {
  const now = Date.now();
  await db
    .update(referralRecipients)
    .set({
      visitCount: sql`${referralRecipients.visitCount} + 1`,
      firstVisitAt: sql`coalesce(${referralRecipients.firstVisitAt}, ${now})`,
    })
    .where(eq(referralRecipients.id, code));
}

async function issueLink({
  db,
  env,
  kind,
  email,
  participantId,
  payload,
}: Pick<Context, "db" | "env"> & {
  kind: "verify" | "access";
  email: string;
  participantId: string | null;
  payload: z.infer<typeof verifyPayloadSchema> | null;
}) {
  const secret = newSecret();
  await db.insert(referralTokens).values({
    hash: await hashSecret(secret),
    kind,
    email,
    participantId,
    payload: payload ? JSON.stringify(payload) : null,
    expiresAt: Date.now() + (kind === "verify" ? VERIFY_TTL_MS : ACCESS_TTL_MS),
  });
  // The secret rides in the fragment, so it never reaches server logs or Referer headers.
  await sendAccessLink({ env, to: email, purpose: kind, url: `${env.REFERRALS_APP_URL}/acceso#${secret}` });
}

interface JoinInput {
  name: string;
  email: string;
  phone: string;
  restaurant: RestaurantInput;
}

/** Sign-up form: nothing is stored as the participant's until the emailed link proves the inbox. */
export async function joinProgram({ db, env, request, name, email, phone, restaurant }: Context & JoinInput) {
  await throttle({ env, key: `join:${clientIp(request)}` });
  await issueLink({ db, env, kind: "verify", email, participantId: null, payload: { name, phone, restaurant } });

  return { sent: true };
}

/** Same answer whether or not the email belongs to a participant. */
export async function requestAccess({ db, env, request, email }: Context & { email: string }) {
  await throttle({ env, key: `access:${clientIp(request)}` });
  await throttle({ env, key: `access:${email}` });
  const participant = await db
    .select({ id: referralParticipants.id })
    .from(referralParticipants)
    .where(eq(referralParticipants.email, email))
    .get();
  if (participant) await issueLink({ db, env, kind: "access", email, participantId: participant.id, payload: null });

  return { sent: true };
}

/** First verified sign-up: invitees keep their invitation's frozen reward, everyone else gets $50. */
async function upsertParticipant({
  db,
  email,
  name,
  phone,
}: Pick<Context, "db"> & { email: string; name: string; phone: string }) {
  const existing = await db.select().from(referralParticipants).where(eq(referralParticipants.email, email)).get();
  if (existing) return existing;

  const invitation = await db
    .select({ id: referralRecipients.id, rewardCents: referralRecipients.rewardCents })
    .from(referralRecipients)
    .where(eq(referralRecipients.email, email))
    .get();
  const participant = {
    id: crypto.randomUUID(),
    email,
    name,
    phone,
    rewardCents: invitation?.rewardCents ?? PUBLIC_REWARD_CENTS,
    recipientId: invitation?.id ?? null,
  };
  // A concurrent verification of the same email loses the race and reads the winner.
  await db.insert(referralParticipants).values(participant).onConflictDoNothing();

  return db.select().from(referralParticipants).where(eq(referralParticipants.email, email)).get();
}

/** Trades a single-use emailed link for a private session. */
export async function exchangeLink({ db, env, request, resHeaders, token }: Context & { token: string }) {
  await throttle({ env, key: `exchange:${clientIp(request)}` });
  const now = Date.now();
  const hash = await hashSecret(token);
  const link = await db
    .update(referralTokens)
    .set({ usedAt: now })
    .where(
      and(
        eq(referralTokens.hash, hash),
        inArray(referralTokens.kind, ["verify", "access"]),
        isNull(referralTokens.usedAt),
        gt(referralTokens.expiresAt, now),
      ),
    )
    .returning()
    .get();
  if (!link) {
    throw new TRPCError({ code: "NOT_FOUND", message: "El enlace expiró o ya se usó. Pide uno nuevo." });
  }

  let participantId = link.participantId;
  if (link.kind === "verify") {
    const { name, phone, restaurant } = verifyPayloadSchema.parse(JSON.parse(link.payload ?? "null"));
    const participant = await upsertParticipant({ db, email: link.email, name, phone });
    if (!participant) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    participantId = participant.id;
    await createReferral({ db, participant, restaurant, actor: "participant" });
  }
  if (!participantId) throw new TRPCError({ code: "NOT_FOUND" });

  const secret = newSecret();
  await db.insert(referralTokens).values({
    hash: await hashSecret(secret),
    kind: "session",
    email: link.email,
    participantId,
    expiresAt: now + SESSION_TTL_MS,
  });
  setSessionCookie({ request, resHeaders, secret });

  return { ok: true };
}

export async function createReferral({
  db,
  participant,
  restaurant,
  actor,
}: Pick<Context, "db"> & {
  participant: { id: string; rewardCents: number };
  restaurant: RestaurantInput;
  actor: string;
}) {
  const key = restaurantKey(restaurant.restaurantName);
  const repeated = await db
    .select({ id: referrals.id })
    .from(referrals)
    .where(and(eq(referrals.participantId, participant.id), eq(referrals.restaurantKey, key)))
    .get();
  // A re-sent verify link for the same restaurant must not duplicate it.
  if (repeated) return repeated;

  const id = crypto.randomUUID();
  await db.batch([
    db.insert(referrals).values({
      id,
      participantId: participant.id,
      restaurantKey: key,
      rewardCents: participant.rewardCents,
      ...restaurant,
    }),
    db.insert(referralAudit).values(auditEntry({ entityType: "referral", entityId: id, action: "received", actor })),
  ]);

  return { id };
}
