import { and, eq, isNull } from "drizzle-orm";

import { branches } from "../schema/branches";

import type { DrizzleDb } from "../client";
import type { ResolvedTenant } from "../domain/tenant";

interface GetGoogleReviewsConfigInput {
  db: DrizzleDb;
  tenant: ResolvedTenant;
}

export interface GoogleReviewsConfig {
  enabled: boolean;
  placeId: string | null;
}

export async function getGoogleReviewsConfig({
  db,
  tenant,
}: GetGoogleReviewsConfigInput): Promise<GoogleReviewsConfig | null> {
  const row = await db
    .select({
      enabled: branches.googleReviewsEnabled,
      placeId: branches.googlePlaceId,
    })
    .from(branches)
    .where(
      and(
        eq(branches.id, tenant.branchId),
        eq(branches.restaurantId, tenant.restaurantId),
        isNull(branches.deletedAt),
        eq(branches.isActive, true),
      ),
    )
    .get();

  return row ?? null;
}
