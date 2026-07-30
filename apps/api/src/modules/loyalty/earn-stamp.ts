import { listBranches } from "@qmenut/db/repositories/admin-branches.repository";
import { getLoyaltyProgram } from "@qmenut/db/repositories/loyalty-admin.repository";
import { addStamp } from "@qmenut/db/repositories/loyalty-ledger.repository";
import { TRPCError } from "@trpc/server";

import { resolveCard } from "./resolve-card";
import { verifyVenueCode } from "../../lib/loyalty/venue-code";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";
import type { LoyaltyTransactionResult } from "@qmenut/db/models/loyalty";

const EARN_COOLDOWN_MS = 4 * 60 * 60 * 1000;

interface EarnStampInput {
  db: DrizzleDb;
  env: RuntimeEnv;
  request: Request;
  host?: string;
  cardToken: string;
  venueCode: string;
}

export async function earnStamp({
  db,
  env,
  request,
  host,
  cardToken,
  venueCode,
}: EarnStampInput): Promise<LoyaltyTransactionResult> {
  const { tenant, customerId } = await resolveCard({ db, env, request, host, cardToken });

  const program = await getLoyaltyProgram({ db, restaurantId: tenant.restaurantId });

  if (!program?.isActive) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "El programa de fidelización no está activo" });
  }

  const throttle = await env.LOYALTY_CODE_LIMITER.limit({ key: customerId });

  if (!throttle.success) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Demasiados intentos, espera un momento" });
  }

  const branches = await listBranches({ db, restaurantId: tenant.restaurantId });
  const matchedBranchId = await verifyVenueCode({
    secret: env.LOYALTY_TOKEN_SECRET,
    restaurantId: tenant.restaurantId,
    branchIds: branches.map((branch) => branch.id),
    code: venueCode,
  });

  if (!matchedBranchId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Código incorrecto" });
  }

  const result = await addStamp({
    db,
    restaurantId: tenant.restaurantId,
    customerId,
    branchId: matchedBranchId,
    cooldownMs: EARN_COOLDOWN_MS,
  });

  if (result === "cooldown") {
    throw new TRPCError({ code: "CONFLICT", message: "Ya tienes el sello de esta visita" });
  }

  return result;
}
