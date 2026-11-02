import { referralAudit } from "@qmenut/db/schema";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { base64UrlEncode } from "../../lib/base64url";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";

/** Anyone outside the invited audience joins at $50. */
export const PUBLIC_REWARD_CENTS = 5000;
/** QMenut Business, $39/month paid annually. */
export const QUALIFYING_PAYMENT_CENTS = 46_800;
export const MAX_CAMPAIGN_RECIPIENTS = 50_000;
/** Current `referral-invite` template version in ming-email-worker; frozen on each batch at launch. */
export const REFERRAL_TEMPLATE_VERSION = 3;

export function defaultBatch({ assigned }: { assigned: number }) {
  return { size: Math.max(0, Math.min(150, MAX_CAMPAIGN_RECIPIENTS - assigned)), rewardCents: 3000 };
}

/** Lowercase, accent- and punctuation-free restaurant name for duplicate warnings. */
export function restaurantKey(name: string): string {
  return name
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]/g, "");
}

/** "0414-123 45 67", "414 1234567" or "+58 414…" → "+584141234567". */
function toVenezuelanE164(value: string): string {
  const digits = value.replaceAll(/\D/g, "");
  if (digits.startsWith("58")) return `+${digits}`;

  return `+58${digits.startsWith("0") ? digits.slice(1) : digits}`;
}

export const venezuelanMobileSchema = z
  .string()
  .trim()
  .transform(toVenezuelanE164)
  .pipe(z.string().regex(/^\+584(?:12|14|16|22|24|26)\d{7}$/, "Usa un celular venezolano, p. ej. 0414-123 4567"));

/** Mobile or landline. */
export const venezuelanPhoneSchema = z
  .string()
  .trim()
  .transform(toVenezuelanE164)
  .pipe(z.string().regex(/^\+58[24]\d{9}$/, "Usa un teléfono venezolano, p. ej. 0212-123 4567"));

export const emailSchema = z.email("Correo no válido").trim().toLowerCase().max(254);

export const restaurantInputSchema = z.object({
  restaurantName: z.string().trim().min(2).max(120),
  contactName: z.string().trim().min(2).max(120),
  contactPhone: venezuelanPhoneSchema,
  contactEmail: emailSchema.nullable(),
  city: z.string().trim().max(80).nullable(),
  website: z.string().trim().max(200).nullable(),
});

export type RestaurantInput = z.infer<typeof restaurantInputSchema>;

/** 32 random bytes for emailed links and sessions; only `hashSecret` of it is stored. */
export function newSecret(): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashSecret(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));

  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

type AuditInsert = typeof referralAudit.$inferInsert;

export function auditEntry(entry: Omit<AuditInsert, "id" | "details" | "createdAt"> & { details?: unknown }) {
  return {
    ...entry,
    id: crypto.randomUUID(),
    details: entry.details === undefined ? null : JSON.stringify(entry.details),
  } satisfies AuditInsert;
}

export function listAudit({
  db,
  entityType,
  entityId,
}: { db: DrizzleDb } & Pick<AuditInsert, "entityType" | "entityId">) {
  const ofEntity = and(eq(referralAudit.entityType, entityType), eq(referralAudit.entityId, entityId));

  return db.select().from(referralAudit).where(ofEntity).orderBy(desc(referralAudit.createdAt)).all();
}

export function isUniqueViolation(error: unknown): boolean {
  const text = error instanceof Error ? `${error.message} ${String(error.cause)}` : String(error);

  return text.includes("UNIQUE constraint failed");
}

/** Per-IP (or per-email) throttle for public referral endpoints. */
export async function throttle({ env, key }: { env: RuntimeEnv; key: string }): Promise<void> {
  const { success } = await env.REFERRAL_LIMITER.limit({ key });
  if (!success) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Demasiados intentos. Espera un minuto." });
  }
}

export function clientIp(request: Request): string {
  return request.headers.get("cf-connecting-ip") ?? "local";
}
