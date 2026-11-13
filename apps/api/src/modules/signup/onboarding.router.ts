import { onboardingIntakeSchema, toTenantFile } from "@qmenut/db/domain/onboarding-intake";
import {
  createIntake,
  getIntake,
  listIntakes,
  markIntakeSent,
  markIntakeUsed,
  submitIntake,
} from "@qmenut/db/repositories/onboarding.repository";
import * as Sentry from "@sentry/cloudflare";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { labProcedure, publicProcedure, router } from "../../trpc/trpc";

import type { RuntimeEnv } from "../../config/env/schema";
import type { IntakeRow } from "@qmenut/db/repositories/onboarding.repository";

const token = z.uuid();
const idInput = z.object({ token });
const expiry = 30 * 86_400_000;
function url(env: RuntimeEnv, id: string) {
  return new URL(`/alta/${id}`, env.ADMIN_APP_URL).href;
}
function labUrl(env: RuntimeEnv) {
  const target = new URL(env.ADMIN_APP_URL);
  target.hostname = target.hostname.replace(/^admin(?=\.)/, "lab");
  if (target.hostname === "localhost") target.port = "5175";
  target.pathname = "/intakes";
  return target.href;
}
// An answer saved under an older form shape reads as "not sent" instead of failing the page.
function readData(row: IntakeRow) {
  return row.dataJson ? (onboardingIntakeSchema.safeParse(JSON.parse(row.dataJson)).data ?? null) : null;
}
function editable(row: IntakeRow | null): asserts row is IntakeRow {
  if (!row || row.expiresAt <= Date.now() || row.status === "used")
    throw new TRPCError({ code: "NOT_FOUND", message: "Este enlace no está disponible" });
}
async function limit(env: RuntimeEnv, request: Request) {
  const { success } = await env.SIGNUP_LIMITER.limit({ key: request.headers.get("cf-connecting-ip") ?? "unknown" });
  if (!success) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Demasiados intentos. Espera un minuto." });
}
async function send({
  env,
  template,
  to,
  data,
}: {
  env: RuntimeEnv;
  template: "onboarding-invite" | "onboarding-submitted";
  to: string;
  data: { label: string; url: string };
}) {
  const response = await env.EMAIL_WORKER.fetch("https://email-worker.internal/send?productId=qmenut", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ template, to, fromProfile: "qmenut-default", data }),
  });
  if (!response.ok) throw new Error(`Onboarding email rejected (${response.status})`);
}
export const onboardingRouter = router({
  // No rate limit: the token is a random UUID and reading it writes nothing.
  get: publicProcedure.input(idInput).query(async ({ ctx, input }) => {
    const row = await getIntake(ctx.db, input.token);
    editable(row);
    return { countryCode: row.countryCode, label: row.label, contactEmail: row.contactEmail, data: readData(row) };
  }),
  submit: publicProcedure.input(idInput.extend({ data: onboardingIntakeSchema })).mutation(async ({ ctx, input }) => {
    await limit(ctx.env, ctx.request);
    const row = await getIntake(ctx.db, input.token);
    editable(row);
    if (row.countryCode !== input.data.countryCode)
      throw new TRPCError({ code: "BAD_REQUEST", message: "El país no coincide con el enlace" });
    if (!(await submitIntake({ db: ctx.db, id: input.token, dataJson: JSON.stringify(input.data), now: Date.now() })))
      throw new TRPCError({ code: "CONFLICT", message: "Este enlace ya no admite cambios" });
    ctx.executionCtx.waitUntil(
      send({
        env: ctx.env,
        template: "onboarding-submitted",
        to: row.createdBy,
        data: { label: row.label, url: labUrl(ctx.env) },
      }).catch((error: unknown) => Sentry.captureException(error, { tags: { module: "onboarding-submitted" } })),
    );
    return { ok: true };
  }),
});
const createSchema = z.object({
  countryCode: z.enum(["ESP", "VEN"]),
  label: z.string().trim().min(1).max(80),
  contactEmail: z.email().trim().max(254),
});
export const labIntakesRouter = router({
  create: labProcedure.input(createSchema).mutation(async ({ ctx, input }) => {
    const id = crypto.randomUUID();
    await createIntake(ctx.db, { id, ...input, createdBy: ctx.staffEmail, expiresAt: Date.now() + expiry });
    return { token: id, url: url(ctx.env, id) };
  }),
  list: labProcedure.query(async ({ ctx }) => {
    const rows = await listIntakes(ctx.db);
    return rows.map(({ dataJson: _dataJson, ...row }) => ({ ...row, url: url(ctx.env, row.id) }));
  }),
  get: labProcedure.input(idInput).query(async ({ ctx, input }) => {
    const row = await getIntake(ctx.db, input.token);
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    const data = readData(row);
    return { ...row, data, tenantFile: data ? toTenantFile(data, "basic") : null, url: url(ctx.env, row.id) };
  }),
  send: labProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const row = await getIntake(ctx.db, input.token);
    editable(row);
    await send({
      env: ctx.env,
      template: "onboarding-invite",
      to: row.contactEmail,
      data: { label: row.label, url: url(ctx.env, row.id) },
    });
    await markIntakeSent({ db: ctx.db, id: row.id, now: Date.now() });
    return { ok: true };
  }),
  markUsed: labProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    if (!(await markIntakeUsed(ctx.db, input.token)))
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "La ficha debe estar enviada" });
    return { ok: true };
  }),
});
