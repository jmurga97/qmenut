import { cancelRedemption as cancelRedemptionRow } from "@qmenut/db/repositories/loyalty-ledger.repository";
import { TRPCError } from "@trpc/server";

import { resolveCard } from "./resolve-card";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";

interface CancelRedemptionInput {
  db: DrizzleDb;
  env: RuntimeEnv;
  request: Request;
  host?: string;
  cardToken: string;
  redemptionId: string;
}

export async function cancelRedemption({
  db,
  env,
  request,
  host,
  cardToken,
  redemptionId,
}: CancelRedemptionInput): Promise<{ ok: true }> {
  const { tenant, customerId } = await resolveCard({ db, env, request, host, cardToken });

  const cancelled = await cancelRedemptionRow({ db, restaurantId: tenant.restaurantId, customerId, redemptionId });

  if (!cancelled) {
    throw new TRPCError({ code: "NOT_FOUND", message: "No hay ningún canje pendiente que cancelar" });
  }

  return { ok: true };
}
