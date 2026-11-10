import { listSubscriptions, upsertManualSubscriptionStatement } from "@qmenut/db/repositories/trials.repository";
import { TRPCError } from "@trpc/server";

import { founderSlotsLeft } from "../../lib/billing/founders";
import { assertPlanAllowed, createCheckoutSession } from "../billing/create-checkout-session";
import { writeBranchPlan } from "../billing/sync-subscription-state";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";
import type { PlanCode } from "@qmenut/permissions";

interface Context {
  db: DrizzleDb;
  env: RuntimeEnv;
}

interface BranchRef {
  restaurantId: string;
  branchId: string;
  planCode: PlanCode;
}

async function findRow(db: DrizzleDb, branchId: string) {
  const rows = await listSubscriptions(db);
  return rows.find((row) => row.branchId === branchId);
}

export async function listLabSubscriptions({ db }: Context) {
  const [rows, slotsLeft] = await Promise.all([listSubscriptions(db), founderSlotsLeft(db)]);
  return { rows, founderSlotsLeft: slotsLeft };
}

/** Plan paid to the team (Zelle, Binance, Pago Móvil…) or a longer demo: no Stripe, ends on `endsAt`. */
export async function activateManualPlan(
  input: Context & BranchRef & { status: "trialing" | "active"; endsAt: string; founder: boolean },
): Promise<void> {
  const { db, env } = input;
  const endsAt = Date.parse(`${input.endsAt}T23:59:59Z`);
  if (endsAt <= Date.now()) throw new TRPCError({ code: "BAD_REQUEST", message: "La fecha de fin ya pasó" });
  await assertPlanAllowed({ db, restaurantId: input.restaurantId, planCode: input.planCode });

  const current = await findRow(db, input.branchId);
  if (current?.hasStripe && current.status !== "canceled") {
    throw new TRPCError({ code: "CONFLICT", message: "Tiene una suscripción de Stripe activa; gestiónala en Stripe" });
  }
  if (input.founder && !current?.founder && (await founderSlotsLeft(db)) === 0) {
    throw new TRPCError({ code: "CONFLICT", message: "Ya no quedan plazas founder" });
  }

  const data = { ...input, endsAt };
  await writeBranchPlan({
    db,
    env,
    restaurantId: input.restaurantId,
    branchId: input.branchId,
    planCode: input.planCode,
    isActive: true,
    subscription: upsertManualSubscriptionStatement({ db, data }),
  });
}

/** Stripe Checkout for the owner to pay (Spain); staff sends the link by WhatsApp. */
export async function createCheckoutLink(input: Context & BranchRef): Promise<{ url: string }> {
  const row = await findRow(input.db, input.branchId);
  if (!row?.ownerEmail) throw new TRPCError({ code: "NOT_FOUND", message: "El restaurante no tiene propietario" });
  return createCheckoutSession({ ...input, userEmail: row.ownerEmail });
}
