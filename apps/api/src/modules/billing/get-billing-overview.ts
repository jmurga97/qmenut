import { listBranches } from "@qmenut/db/repositories/admin-branches.repository";
import { getStripeCustomer, listBranchSubscriptions } from "@qmenut/db/repositories/billing.repository";
import { getRestaurantById } from "@qmenut/db/repositories/restaurants.repository";

import { founderSlotsLeft } from "../../lib/billing/founders";

import type { DrizzleDb } from "@qmenut/db/client";
import type { BranchSubscriptionRow } from "@qmenut/db/repositories/billing.repository";

export interface BillingBranchOverview {
  branchId: string;
  branchName: string;
  planCode: BranchSubscriptionRow["planCode"] | null;
  status: BranchSubscriptionRow["status"] | null;
  /** False for operator-created trials, which have no Stripe subscription to manage yet. */
  hasStripeSubscription: boolean;
  cancelAtPeriodEnd: boolean;
  /** Stripe's renewal date, or when a demo / staff-activated plan ends. */
  currentPeriodEnd: number | null;
  isActive: boolean;
}

export interface BillingOverview {
  hasCustomer: boolean;
  /** "VEN" pays the team directly (no Stripe); everything else goes through Checkout. */
  countryCode: string | null;
  founderSlotsLeft: number;
  branches: BillingBranchOverview[];
}

interface GetBillingOverviewInput {
  db: DrizzleDb;
  restaurantId: string;
}

export async function getBillingOverview({ db, restaurantId }: GetBillingOverviewInput): Promise<BillingOverview> {
  const [branches, subscriptions, customer, restaurant, slotsLeft] = await Promise.all([
    listBranches({ db, restaurantId }),
    listBranchSubscriptions({ db, restaurantId }),
    getStripeCustomer({ db, restaurantId }),
    getRestaurantById({ db, restaurantId }),
    founderSlotsLeft(db),
  ]);

  const subscriptionByBranch = new Map(subscriptions.map((subscription) => [subscription.branchId, subscription]));

  return {
    hasCustomer: Boolean(customer),
    countryCode: restaurant?.countryCode ?? null,
    founderSlotsLeft: slotsLeft,
    branches: branches.map((branch) => {
      const subscription = subscriptionByBranch.get(branch.id);
      return {
        branchId: branch.id,
        branchName: branch.name,
        planCode: subscription?.planCode ?? null,
        status: subscription?.status ?? null,
        hasStripeSubscription: Boolean(subscription?.stripeSubscriptionId),
        cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
        currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
        isActive: branch.isActive,
      };
    }),
  };
}
