import { dismissStampOutcome as dismissStampOutcomeRow } from "@qmenut/db/repositories/loyalty-ledger.repository";

import { resolveCard } from "./resolve-card";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";

interface DismissStampOutcomeInput {
  db: DrizzleDb;
  env: RuntimeEnv;
  request: Request;
  host?: string;
  cardToken: string;
  requestId: string;
}

/** Explicit, not a side effect of getCard: a focus refetch would clear the notice before the guest saw it. */
export async function dismissStampOutcome({
  db,
  env,
  request,
  host,
  cardToken,
  requestId,
}: DismissStampOutcomeInput): Promise<{ ok: true }> {
  const { tenant, customerId } = await resolveCard({ db, env, request, host, cardToken, requireConsent: false });

  await dismissStampOutcomeRow({ db, restaurantId: tenant.restaurantId, customerId, requestId });

  return { ok: true };
}
