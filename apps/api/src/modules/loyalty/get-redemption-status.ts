import { expireStaleRedemptions, getRedemption } from "@qmenut/db/repositories/loyalty-ledger.repository";
import { TRPCError } from "@trpc/server";

import { resolveCard } from "./resolve-card";
import { REDEMPTION_TTL_MS } from "../../lib/loyalty/token";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";
import type { RedemptionStatus } from "@qmenut/db/models/loyalty";

interface GetRedemptionStatusInput {
  db: DrizzleDb;
  env: RuntimeEnv;
  request: Request;
  host?: string;
  cardToken: string;
  redemptionId: string;
}

export interface RedemptionStatusResult {
  status: RedemptionStatus;
  validatedAt: number | null;
}

export async function getRedemptionStatus({
  db,
  env,
  request,
  host,
  cardToken,
  redemptionId,
}: GetRedemptionStatusInput): Promise<RedemptionStatusResult> {
  const { tenant, customerId } = await resolveCard({ db, env, request, host, cardToken });

  await expireStaleRedemptions({ db, restaurantId: tenant.restaurantId, olderThanMs: REDEMPTION_TTL_MS });

  const redemption = await getRedemption({ db, restaurantId: tenant.restaurantId, redemptionId });

  if (!redemption || redemption.customerId !== customerId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Canje no encontrado" });
  }

  return { status: redemption.status, validatedAt: redemption.validatedAt };
}
