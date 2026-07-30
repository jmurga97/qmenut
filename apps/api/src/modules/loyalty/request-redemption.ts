import { getCardState } from "@qmenut/db/repositories/customers.repository";
import { getLoyaltyProgram, getReward } from "@qmenut/db/repositories/loyalty-admin.repository";
import {
  createRedemption,
  expireStaleRedemptions,
  findPendingRedemption,
} from "@qmenut/db/repositories/loyalty-ledger.repository";
import { TRPCError } from "@trpc/server";

import { resolveCard } from "./resolve-card";
import { REDEMPTION_TTL_MS } from "../../lib/loyalty/token";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";

interface RequestRedemptionInput {
  db: DrizzleDb;
  env: RuntimeEnv;
  request: Request;
  host?: string;
  cardToken: string;
  rewardId: string;
}

export interface RequestRedemptionResult {
  expiresAt: number;
  redemptionId: string;
}

export async function requestRedemption({
  db,
  env,
  request,
  host,
  cardToken,
  rewardId,
}: RequestRedemptionInput): Promise<RequestRedemptionResult> {
  const { tenant, customerId } = await resolveCard({ db, env, request, host, cardToken });

  const program = await getLoyaltyProgram({ db, restaurantId: tenant.restaurantId });

  if (!program?.isActive) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "El programa de fidelización no está activo" });
  }

  const reward = await getReward({ db, restaurantId: tenant.restaurantId, rewardId });

  if (!reward?.isActive) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Recompensa no encontrada" });
  }

  const card = await getCardState({ db, customerId, restaurantId: tenant.restaurantId });

  if (!card || card.stampsBalance < reward.cost) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No tienes suficientes sellos para esta recompensa" });
  }

  await expireStaleRedemptions({ db, restaurantId: tenant.restaurantId, olderThanMs: REDEMPTION_TTL_MS });

  const existing = await findPendingRedemption({ db, restaurantId: tenant.restaurantId, customerId });

  if (existing) {
    throw new TRPCError({ code: "CONFLICT", message: "Ya hay un canje pendiente" });
  }

  const createdAt = Date.now();
  const redemptionId = await createRedemption({
    db,
    restaurantId: tenant.restaurantId,
    customerId,
    rewardId,
    cost: reward.cost,
  });

  return { redemptionId, expiresAt: createdAt + REDEMPTION_TTL_MS };
}
