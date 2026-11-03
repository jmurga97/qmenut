import { referralParticipants, referralTokens } from "@qmenut/db/schema";
import { and, eq, gt } from "drizzle-orm";

import { hashSecret } from "./referral-domain";

import type { DrizzleDb } from "@qmenut/db/client";

const COOKIE = "qm_referral";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function readCookie(request: Request): string | null {
  for (const part of request.headers.get("cookie")?.split(";") ?? []) {
    const [name, ...value] = part.trim().split("=");
    if (name === COOKIE) return value.join("=") || null;
  }

  return null;
}

/** Host-only cookie on the referrals app: its Worker proxies /trpc, so the API never shares it with other hosts. */
export function setSessionCookie({
  request,
  resHeaders,
  secret,
}: {
  request: Request;
  resHeaders: Headers;
  secret: string | null;
}) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  const maxAge = secret ? Math.floor(SESSION_TTL_MS / 1000) : 0;
  resHeaders.append(
    "set-cookie",
    `${COOKIE}=${secret ?? ""}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`,
  );
}

export async function resolveParticipant({ db, request }: { db: DrizzleDb; request: Request }) {
  const secret = readCookie(request);
  if (!secret) return null;

  const hash = await hashSecret(secret);
  const liveSession = and(
    eq(referralTokens.hash, hash),
    eq(referralTokens.kind, "session"),
    gt(referralTokens.expiresAt, Date.now()),
  );
  const row = await db
    .select({ participant: referralParticipants })
    .from(referralTokens)
    .innerJoin(referralParticipants, eq(referralParticipants.id, referralTokens.participantId))
    .where(liveSession)
    .get();

  return row ? { participant: row.participant, sessionHash: hash } : null;
}
