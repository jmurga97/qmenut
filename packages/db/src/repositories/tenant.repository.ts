import { and, eq, isNull } from "drizzle-orm";

import { normalizeTenantHost } from "../domain/tenant";
import { branches } from "../schema/branches";

import type { DrizzleDb } from "../client";
import type { ResolvedTenant } from "../domain/tenant";

interface ResolveTenantByHostInput {
  db: DrizzleDb;
  host: string;
}

export async function resolveTenantByHost({ db, host }: ResolveTenantByHostInput): Promise<ResolvedTenant | null> {
  const normalizedHost = normalizeTenantHost(host);

  if (!normalizedHost) {
    return null;
  }

  const row = await db
    .select({
      branchId: branches.id,
      restaurantId: branches.restaurantId,
    })
    .from(branches)
    .where(and(eq(branches.customDomain, normalizedHost), isNull(branches.deletedAt), eq(branches.isActive, true)))
    .get();

  return row ?? null;
}
