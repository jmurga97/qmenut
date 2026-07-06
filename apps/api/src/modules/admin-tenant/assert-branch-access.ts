import { TRPCError } from "@trpc/server";
import { getBranch } from "@qmenut/db/repositories/admin-branches.repository";

import type { DrizzleDb } from "@qmenut/db";

interface AssertBranchAccessInput {
  db: DrizzleDb;
  restaurantId: string;
  branchId: string;
}

/**
 * Autorización por sucursal: toda mutación que reciba un branchId debe pasar
 * por aquí antes de tocar datos. NOT_FOUND (y no FORBIDDEN) para no revelar
 * la existencia de sucursales de otros tenants.
 */
export async function assertBranchAccess({ db, restaurantId, branchId }: AssertBranchAccessInput) {
  const branch = await getBranch({ db, restaurantId, branchId });

  if (!branch) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Branch not found" });
  }

  return branch;
}
