import { listBranchPlanCodes } from "@qmenut/db/repositories/admin-branches.repository";
import { hasFeature, RESTAURANT_FEATURES } from "@qmenut/permissions";
import { TRPCError } from "@trpc/server";

import type { DrizzleDb } from "@qmenut/db/client";
import type { PlanCode, SubscriptionStatus } from "@qmenut/db/repositories/billing.repository";
import type { PlanFeature } from "@qmenut/permissions";

export function entitledPlanCode(status: SubscriptionStatus, planCode: PlanCode): PlanCode {
  return status === "canceled" ? "basic" : planCode;
}

interface FeatureContext {
  db: DrizzleDb;
  tenant: { restaurantId: string };
}

interface FeatureCheck {
  feature: PlanFeature;
  /** Required for branch-scoped features; ignored for restaurant-scoped ones. */
  branchId?: string;
}

/**
 * Lee branches.plan_code (el plan efectivo que escribe syncSubscriptionState). Las funciones
 * de restaurante se activan si alguna sucursal las tiene; el resto depende de la sucursal.
 */
export async function hasPlanFeature(
  { db, tenant }: FeatureContext,
  { feature, branchId }: FeatureCheck,
): Promise<boolean> {
  const restaurantScoped = RESTAURANT_FEATURES.includes(feature);

  if (!restaurantScoped && !branchId) {
    throw new Error(`La función ${feature} necesita una sucursal`);
  }

  const planCodes = await listBranchPlanCodes({
    db,
    restaurantId: tenant.restaurantId,
    branchId: restaurantScoped ? undefined : branchId,
  });

  return hasFeature(planCodes, feature);
}

export async function requireFeature(ctx: FeatureContext, check: FeatureCheck): Promise<void> {
  if (!(await hasPlanFeature(ctx, check))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Disponible en el plan Business" });
  }
}
