import { getBranchSubscription } from "@qmenut/db/repositories/billing.repository";
import { TRPCError } from "@trpc/server";

import type { DrizzleDb } from "@qmenut/db/client";
import type { PlanCode, SubscriptionStatus } from "@qmenut/db/repositories/billing.repository";

const PLAN_LEVEL: Record<PlanCode, number> = {
  basic: 0,
  business: 1,
};

export interface BranchEntitlement {
  planCode: PlanCode;
  subscriptionStatus: SubscriptionStatus | null;
}

interface GetBranchEntitlementInput {
  db: DrizzleDb;
  restaurantId: string;
  branchId: string;
}

export function entitledPlanCode(status: SubscriptionStatus, planCode: PlanCode): PlanCode {
  return status === "canceled" ? "basic" : planCode;
}

export async function getBranchEntitlement({
  db,
  restaurantId,
  branchId,
}: GetBranchEntitlementInput): Promise<BranchEntitlement> {
  const subscription = await getBranchSubscription({ db, restaurantId, branchId });

  if (!subscription) {
    return { planCode: "basic", subscriptionStatus: null };
  }

  return {
    planCode: entitledPlanCode(subscription.status, subscription.planCode),
    subscriptionStatus: subscription.status,
  };
}

export function requirePlan(entitlement: BranchEntitlement, minPlan: PlanCode): void {
  if (PLAN_LEVEL[entitlement.planCode] < PLAN_LEVEL[minPlan]) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "El plan de la sucursal no permite esta función",
    });
  }
}
