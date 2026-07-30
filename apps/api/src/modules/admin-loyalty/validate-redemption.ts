import {
  expireStaleRedemptions,
  validateRedemption as validateRedemptionRow,
} from "@qmenut/db/repositories/loyalty-ledger.repository";
import { TRPCError } from "@trpc/server";

import { REDEMPTION_TTL_MS } from "../../lib/loyalty/token";
import { assertBranchAccess } from "../admin-tenant/assert-branch-access";

import type { DrizzleDb } from "@qmenut/db/client";
import type { LoyaltyTransactionResult } from "@qmenut/db/models/loyalty";

interface ValidateRedemptionInput {
  db: DrizzleDb;
  restaurantId: string;
  redemptionId: string;
  branchId: string;
  validatedBy: string;
}

export async function validateRedemption({
  db,
  restaurantId,
  redemptionId,
  branchId,
  validatedBy,
}: ValidateRedemptionInput): Promise<LoyaltyTransactionResult> {
  await assertBranchAccess({ db, restaurantId, branchId });
  await expireStaleRedemptions({ db, restaurantId, olderThanMs: REDEMPTION_TTL_MS });

  const result = await validateRedemptionRow({ db, restaurantId, redemptionId, branchId, validatedBy });

  if (result === "conflict") {
    throw new TRPCError({
      code: "CONFLICT",
      message: "El canje ya se ha validado, ha caducado o no hay sellos suficientes",
    });
  }

  return result;
}
