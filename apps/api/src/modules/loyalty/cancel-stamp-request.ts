import { cancelStampRequest as cancelStampRequestRow } from "@qmenut/db/repositories/loyalty-ledger.repository";
import { TRPCError } from "@trpc/server";

import { resolveCard } from "./resolve-card";
import { resolveNotifications } from "../notifications/emit-notification";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";

interface CancelStampRequestInput {
  db: DrizzleDb;
  env: RuntimeEnv;
  request: Request;
  host?: string;
  cardToken: string;
  requestId: string;
}

export async function cancelStampRequest({
  db,
  env,
  request,
  host,
  cardToken,
  requestId,
}: CancelStampRequestInput): Promise<{ ok: true }> {
  const { tenant, customerId } = await resolveCard({ db, env, request, host, cardToken });

  const cancelled = await cancelStampRequestRow({ db, restaurantId: tenant.restaurantId, customerId, requestId });

  if (!cancelled) {
    throw new TRPCError({ code: "NOT_FOUND", message: "No hay ninguna solicitud de sellos que cancelar" });
  }

  await resolveNotifications({
    db,
    type: "loyalty.stampRequest",
    subjectIds: [requestId],
    handledBy: null,
    outcome: "cancelled",
  });

  return { ok: true };
}
