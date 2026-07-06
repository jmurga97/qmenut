import { getStripeCustomer, listBranchSubscriptions } from "@qmenut/db/repositories/billing.repository";
import { listBranches } from "@qmenut/db/repositories/admin-branches.repository";

import type { DrizzleDb } from "@qmenut/db";
import type { BranchSubscriptionRow } from "@qmenut/db/repositories/billing.repository";

export interface BillingBranchOverview {
  branchId: string;
  branchName: string;
  planCode: BranchSubscriptionRow["planCode"] | null;
  status: BranchSubscriptionRow["status"] | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: number | null;
}

export interface BillingOverview {
  hasCustomer: boolean;
  branches: BillingBranchOverview[];
}

interface GetBillingOverviewInput {
  db: DrizzleDb;
  restaurantId: string;
}

export async function getBillingOverview({ db, restaurantId }: GetBillingOverviewInput): Promise<BillingOverview> {
  const [branches, subscriptions, customer] = await Promise.all([
    listBranches({ db, restaurantId }),
    listBranchSubscriptions({ db, restaurantId }),
    getStripeCustomer({ db, restaurantId }),
  ]);

  const subscriptionByBranch = new Map(subscriptions.map((subscription) => [subscription.branchId, subscription]));

  return {
    hasCustomer: Boolean(customer),
    branches: branches.map((branch) => {
      const subscription = subscriptionByBranch.get(branch.id);
      return {
        branchId: branch.id,
        branchName: branch.name,
        planCode: subscription?.planCode ?? null,
        status: subscription?.status ?? null,
        cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
        currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      };
    }),
  };
}
