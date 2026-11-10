import { normalizeTenantHost } from "@qmenut/db/domain/tenant";
import { createTrialTenant, hasAnyMembership, isHostTaken } from "@qmenut/db/repositories/trials.repository";
import { isInternalSupportEmail } from "@qmenut/permissions";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createAuth, sendSignupCode } from "../../auth/create-auth";
import { FOUNDER_SLOTS, founderSlotsLeft } from "../../lib/billing/founders";
import { bumpPublicContentVersion, putTheme } from "../../lib/theme/tenant-theme-store";
import { publicProcedure, router } from "../../trpc/trpc";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";

const TRIAL_DAYS = 14;
const DAY_MS = 86_400_000;

const COUNTRIES = {
  ESP: { sourceCurrency: "EUR", timezone: "Europe/Madrid" },
  VEN: { sourceCurrency: "USD", timezone: "America/Caracas" },
} as const;

// Our own hosts and the template demos; a demo can never shadow them.
const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "assets",
  "blog",
  "cafe",
  "cdn",
  "demo",
  "dev",
  "email-hooks",
  "fast",
  "fine",
  "her",
  "lab",
  "landing",
  "mail",
  "media",
  "qmenut",
  "referidos",
  "soporte",
  "static",
  "status",
  "tapas",
  "www",
]);

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/, "Usa de 3 a 40 letras, números o guiones");
const emailSchema = z.email().trim().toLowerCase().max(254);
const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/);

const createTrialInput = z.object({
  email: emailSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
  restaurant: z.object({
    name: z.string().trim().min(2).max(80),
    countryCode: z.enum(["ESP", "VEN"]),
    slug: slugSchema,
  }),
  theme: z.object({
    template: z.enum(["fine", "her", "fast", "cafe", "tapas"]),
    primary: hexColor,
    secondary: hexColor,
  }),
  owner: z.object({
    name: z.string().trim().min(2).max(80),
    phone: z
      .string()
      .trim()
      .regex(/^\+[1-9]\d{7,14}$/, "Teléfono con prefijo, p. ej. +584121234567"),
    marketingConsent: z.boolean(),
  }),
  termsAccepted: z.literal(true),
});

function trialHost(env: RuntimeEnv, slug: string): string {
  return normalizeTenantHost(`${slug}${env.TRIAL_HOST_SUFFIX}`);
}

async function slugProblem({ env, db, slug }: { env: RuntimeEnv; db: DrizzleDb; slug: string }) {
  if (RESERVED_SLUGS.has(slug)) return "Ese nombre está reservado";
  if (await isHostTaken({ db, host: trialHost(env, slug) })) return "Ese nombre ya está en uso";
  return null;
}

async function verifyTurnstile({ env, request, token }: { env: RuntimeEnv; request: Request; token: string }) {
  if (!env.TURNSTILE_SECRET_KEY) return false;
  const body = new FormData();
  body.append("secret", env.TURNSTILE_SECRET_KEY);
  body.append("response", token);
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) body.append("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  const result: { success?: boolean } = await response.json();
  return result.success === true;
}

async function checkSubdomain({ env, db, slug }: { env: RuntimeEnv; db: DrizzleDb; slug: string }) {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return { host: null, problem: parsed.error.issues[0]?.message ?? "No es válido" };
  return { host: trialHost(env, parsed.data), problem: await slugProblem({ env, db, slug: parsed.data }) };
}

const SLUG_INPUT = z.object({ slug: z.string() });
const REQUEST_CODE_INPUT = z.object({ email: emailSchema, turnstileToken: z.string().min(1).max(2048) });

async function assertNotLimited(env: RuntimeEnv, request: Request): Promise<void> {
  const key = request.headers.get("cf-connecting-ip") ?? "unknown";
  const { success } = await env.SIGNUP_LIMITER.limit({ key });
  if (!success) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Demasiados intentos. Espera un minuto." });
}

/** Public, called by the landing at qmenut.app/empezar. Nothing is written until the email code checks out. */
export const signupRouter = router({
  founders: publicProcedure.query(async ({ ctx }) => ({
    total: FOUNDER_SLOTS,
    left: await founderSlotsLeft(ctx.db),
  })),

  checkSubdomain: publicProcedure
    .input(SLUG_INPUT)
    .query(({ ctx, input }) => checkSubdomain({ env: ctx.env, db: ctx.db, slug: input.slug })),

  requestCode: publicProcedure.input(REQUEST_CODE_INPUT).mutation(async ({ ctx, input }) => {
    await assertNotLimited(ctx.env, ctx.request);
    if (!(await verifyTurnstile({ env: ctx.env, request: ctx.request, token: input.turnstileToken }))) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No pudimos comprobar que no eres un robot. Reintenta." });
    }
    if (isInternalSupportEmail(input.email)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Usa el correo del restaurante" });
    }
    await sendSignupCode({ db: ctx.db, env: ctx.env, email: input.email });
    return { sent: true };
  }),

  createTrial: publicProcedure.input(createTrialInput).mutation(async ({ ctx, input }) => {
    await assertNotLimited(ctx.env, ctx.request);
    const problem = await slugProblem({ env: ctx.env, db: ctx.db, slug: input.restaurant.slug });
    if (problem) throw new TRPCError({ code: "CONFLICT", message: problem });

    // Verifies the code, creates the user if new and opens the session in one Better Auth call.
    let userId: string;
    try {
      const { headers, response } = await createAuth({
        db: ctx.db,
        env: ctx.env,
        allowSignUp: true,
      }).api.signInEmailOTP({
        body: { email: input.email, otp: input.code, name: input.owner.name },
        headers: ctx.request.headers,
        returnHeaders: true,
      });
      headers.forEach((value, name) => {
        if (name === "set-cookie") ctx.resHeaders.append(name, value);
      });
      userId = response.user.id;
    } catch {
      throw new TRPCError({ code: "BAD_REQUEST", message: "El código no es correcto o ha caducado" });
    }

    // One demo per email, forever. The session stays open, so the panel shows the restaurant they already have.
    if (await hasAnyMembership({ db: ctx.db, userId })) {
      throw new TRPCError({ code: "CONFLICT", message: "Este correo ya tiene un restaurante. Entra en el panel." });
    }

    const host = trialHost(ctx.env, input.restaurant.slug);
    try {
      await createTrialTenant({
        db: ctx.db,
        owner: { userId, phone: input.owner.phone, marketingConsent: input.owner.marketingConsent },
        restaurant: {
          name: input.restaurant.name,
          countryCode: input.restaurant.countryCode,
          ...COUNTRIES[input.restaurant.countryCode],
        },
        host,
        trialEndsAt: Date.now() + TRIAL_DAYS * DAY_MS,
      });
    } catch (error) {
      // The unique index on custom_domain settles a race for the same name.
      if (await isHostTaken({ db: ctx.db, host })) {
        throw new TRPCError({ code: "CONFLICT", message: "Ese nombre ya está en uso" });
      }
      throw error;
    }

    // ponytail: D1 first, then KV; a failed KV write leaves the default look, fixed by saving the theme in the panel.
    try {
      await putTheme({ config: input.theme, env: ctx.env, host });
      await bumpPublicContentVersion(ctx.env, host);
    } catch (error) {
      console.error(`No se pudo publicar el tema de la demo ${host}`, error);
    }

    return { host, adminUrl: `${ctx.env.ADMIN_APP_URL}/menu` };
  }),
});
