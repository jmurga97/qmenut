import { rejectRedemption as rejectRedemptionRow } from "@qmenut/db/repositories/loyalty-ledger.repository";
import { TRPCError } from "@trpc/server";

import type { DrizzleDb } from "@qmenut/db/client";

interface RejectRedemptionInput {
  db: DrizzleDb;
  restaurantId: string;
  redemptionId: string;
}

export async function rejectRedemption({ db, restaurantId, redemptionId }: RejectRedemptionInput): Promise<{
  ok: true;
}> {
  const rejected = await rejectRedemptionRow({ db, restaurantId, redemptionId });

  if (!rejected) {
    throw new TRPCError({ code: "NOT_FOUND", message: "No hay ningún canje pendiente que rechazar" });
  }

  return { ok: true };
}
