import { listBranches } from "@qmenut/db/repositories/admin-branches.repository";
import { getLoyaltyProgram } from "@qmenut/db/repositories/loyalty-admin.repository";
import { createStampRequest } from "@qmenut/db/repositories/loyalty-ledger.repository";
import { TRPCError } from "@trpc/server";

import { resolveCard } from "./resolve-card";
import { verifyVenueCode } from "../../lib/loyalty/venue-code";
import { emitNotification } from "../notifications/emit-notification";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";

const REQUEST_COOLDOWN_MS = 4 * 60 * 60 * 1000;

interface RequestStampsInput {
  db: DrizzleDb;
  env: RuntimeEnv;
  request: Request;
  host?: string;
  cardToken: string;
  venueCode: string;
  quantity: number;
}

export interface RequestStampsResult {
  requestId: string;
}

export async function requestStamps({
  db,
  env,
  request,
  host,
  cardToken,
  venueCode,
  quantity,
}: RequestStampsInput): Promise<RequestStampsResult> {
  const { tenant, customerId } = await resolveCard({ db, env, request, host, cardToken });

  const program = await getLoyaltyProgram({ db, restaurantId: tenant.restaurantId });

  if (!program?.isActive) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "El programa de fidelización no está activo" });
  }

  const throttle = await env.LOYALTY_CODE_LIMITER.limit({ key: customerId });

  if (!throttle.success) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Demasiados intentos, espera un momento" });
  }

  if (quantity > program.stampRequestLimit) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Has pedido más sellos de los permitidos" });
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

  const created = await createStampRequest({
    db,
    restaurantId: tenant.restaurantId,
    customerId,
    branchId: matchedBranchId,
    quantity,
    cooldownMs: REQUEST_COOLDOWN_MS,
  });

  if (created === "cooldown") {
    throw new TRPCError({ code: "CONFLICT", message: "Ya pediste sellos en esta visita" });
  }

  await emitNotification({
    db,
    env,
    event: {
      type: "loyalty.stampRequest",
      restaurantId: tenant.restaurantId,
      branchId: matchedBranchId,
      subjectId: created.id,
      facts: { quantity },
    },
  });

  return { requestId: created.id };
}
