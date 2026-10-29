import { rejectRedemption as rejectRedemptionRow } from "@qmenut/db/repositories/loyalty-ledger.repository";
import { TRPCError } from "@trpc/server";

import { resolveNotifications } from "../notifications/emit-notification";

import type { DrizzleDb } from "@qmenut/db/client";

interface RejectRedemptionInput {
  db: DrizzleDb;
  restaurantId: string;
  redemptionId: string;
  rejectedBy: string;
}

export async function rejectRedemption({ db, restaurantId, redemptionId, rejectedBy }: RejectRedemptionInput): Promise<{
  ok: true;
}> {
  const rejected = await rejectRedemptionRow({ db, restaurantId, redemptionId });

  if (!rejected) {
    throw new TRPCError({ code: "NOT_FOUND", message: "No hay ningún canje pendiente que rechazar" });
  }

  await resolveNotifications({
    db,
    type: "loyalty.redemption",
    subjectIds: [redemptionId],
    handledBy: rejectedBy,
    outcome: "rejected",
  });

  return { ok: true };
}
