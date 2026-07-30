import {
  compensateTransaction,
  findTransaction,
  hasCompensation,
} from "@qmenut/db/repositories/loyalty-ledger.repository";
import { TRPCError } from "@trpc/server";

import { assertBranchAccess } from "../admin-tenant/assert-branch-access";

import type { DrizzleDb } from "@qmenut/db/client";
import type { LoyaltyTransactionResult } from "@qmenut/db/models/loyalty";

interface UndoLoyaltyActionInput {
  db: DrizzleDb;
  restaurantId: string;
  transactionId: number;
  branchId: string;
}

export async function undoLoyaltyAction({
  db,
  restaurantId,
  transactionId,
  branchId,
}: UndoLoyaltyActionInput): Promise<LoyaltyTransactionResult> {
  await assertBranchAccess({ db, restaurantId, branchId });

  const transaction = await findTransaction({ db, restaurantId, transactionId });

  if (!transaction) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Transacción no encontrada" });
  }

  if (transaction.type !== "earn" && transaction.type !== "redeem") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Solo se pueden deshacer las transacciones de obtención o canje",
    });
  }

  const alreadyCompensated = await hasCompensation({ db, restaurantId, transactionId });

  if (alreadyCompensated) {
    throw new TRPCError({ code: "CONFLICT", message: "Esta transacción ya se ha deshecho" });
  }

  try {
    return await compensateTransaction({ db, restaurantId, transaction, branchId });
  } catch {
    throw new TRPCError({ code: "CONFLICT", message: "No se puede deshacer: el saldo de sellos quedaría negativo" });
  }
}
