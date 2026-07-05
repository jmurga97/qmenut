import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import { promotions, vDishPromotionPrices } from "../schema/promotions";

import type { DrizzleDb } from "../client";
import type { ResolvedTenant } from "../domain/tenant";
import type { PromotionCandidateRow, PromotionRow } from "../mappers/promotion.mapper";

interface TenantInput {
  db: DrizzleDb;
  tenant: ResolvedTenant;
}

interface TenantIdsInput extends TenantInput {
  ids: string[];
}

export async function getPromotionRows({ db, tenant }: TenantInput): Promise<PromotionRow[]> {
  return db
    .select()
    .from(promotions)
    .where(
      and(
        eq(promotions.branchId, tenant.branchId),
        eq(promotions.restaurantId, tenant.restaurantId),
        isNull(promotions.deletedAt),
        eq(promotions.status, "active"),
      ),
    )
    .orderBy(asc(promotions.priority), asc(promotions.name))
    .all();
}

export async function getPromotionCandidateRows({ db, ids, tenant }: TenantIdsInput): Promise<PromotionCandidateRow[]> {
  if (ids.length === 0) {
    return [];
  }

  return db
    .select()
    .from(vDishPromotionPrices)
    .where(and(eq(vDishPromotionPrices.branchId, tenant.branchId), inArray(vDishPromotionPrices.dishId, ids)))
    .all();
}
