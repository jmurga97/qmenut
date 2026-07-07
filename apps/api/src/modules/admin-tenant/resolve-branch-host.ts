import { TRPCError } from "@trpc/server";

import { assertBranchAccess } from "./assert-branch-access";

import type { DrizzleDb } from "@qmenut/db";

interface ResolveBranchHostInput {
  db: DrizzleDb;
  restaurantId: string;
  branchId: string;
}

/**
 * El tema se guarda en KV por host de la sucursal. Autoriza la sucursal y devuelve
 * su dominio; sin dominio no hay clave KV que gestionar.
 */
export async function resolveBranchHost({ db, restaurantId, branchId }: ResolveBranchHostInput): Promise<string> {
  const branch = await assertBranchAccess({ db, restaurantId, branchId });

  if (!branch.customDomain) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "La sucursal no tiene un dominio asignado todavía",
    });
  }

  return branch.customDomain;
}

/**
 * Non-throwing variant for cache-invalidation callers: a menu edit must still succeed on a
 * branch with no domain assigned yet, it just means there's nothing to cache-bust.
 */
export async function resolveBranchHostOrNull({
  db,
  restaurantId,
  branchId,
}: ResolveBranchHostInput): Promise<string | null> {
  const branch = await assertBranchAccess({ db, restaurantId, branchId });

  return branch.customDomain ?? null;
}
