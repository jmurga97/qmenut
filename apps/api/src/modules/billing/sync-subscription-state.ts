import { getBranch } from "@qmenut/db/repositories/admin-branches.repository";
import {
  updateBranchPlanStatement,
  upsertBranchSubscriptionStatement,
} from "@qmenut/db/repositories/billing.repository";
import { setBranchActiveStatement } from "@qmenut/db/repositories/trials.repository";
import { buildDefaultTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";

import { mapStripeStatus } from "./map-stripe-status";
import { entitledPlanCode } from "../../lib/billing/entitlement";
import { planCodeFor } from "../../lib/billing/plan-catalog";
import { bumpPublicContentVersionForBranch } from "../../lib/public-content-version";
import { getTheme, putTheme } from "../../lib/theme/tenant-theme-store";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";
import type { PlanCode } from "@qmenut/db/repositories/billing.repository";
import type { BatchItem } from "drizzle-orm/batch";
import type Stripe from "stripe";

interface SyncSubscriptionStateInput {
  db: DrizzleDb;
  env: RuntimeEnv;
  subscription: Stripe.Subscription;
}

/**
 * Fuente única de verdad para persistir el estado de una suscripción Stripe.
 * Idempotente: siempre escribe el último estado (upsert), así los reintentos y el
 * desorden de eventos convergen al estado correcto. Lee restaurantId/branchId de
 * los metadatos que fijamos en subscription_data al crear el checkout.
 */
export async function syncSubscriptionState({ db, env, subscription }: SyncSubscriptionStateInput): Promise<void> {
  const restaurantId = subscription.metadata.restaurantId;
  const branchId = subscription.metadata.branchId;

  if (!restaurantId || !branchId) {
    return;
  }

  const priceId = subscription.items.data[0]?.price.id ?? null;
  const planCode = priceId ? planCodeFor(env, priceId) : null;

  if (!priceId || !planCode) {
    return;
  }

  const currentPeriodEnd = subscription.items.data[0]?.current_period_end ?? null;
  const status = mapStripeStatus(subscription.status);

  await writeBranchPlan({
    db,
    env,
    restaurantId,
    branchId,
    planCode: entitledPlanCode(status, planCode),
    // Paying again brings back the public menu of an expired demo; a Stripe cancellation keeps it on as Basic.
    isActive: status === "canceled" ? undefined : true,
    subscription: upsertBranchSubscriptionStatement({
      db,
      data: {
        restaurantId,
        branchId,
        planCode,
        status,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: currentPeriodEnd ? currentPeriodEnd * 1000 : null,
        founder: subscription.metadata.founder === "true" || undefined,
      },
    }),
  });
}

interface WriteBranchPlanInput {
  db: DrizzleDb;
  env: RuntimeEnv;
  restaurantId: string;
  branchId: string;
  /** Effective plan for entitlements (canceled → basic). */
  planCode: PlanCode;
  /** Public menu on/off; undefined leaves it as it is. */
  isActive?: boolean;
  subscription: BatchItem<"sqlite">;
}

/** One write path for Stripe, staff activations and demo expiry: subscription row, branch plan, theme flag, cache. */
export async function writeBranchPlan({
  db,
  env,
  restaurantId,
  branchId,
  planCode,
  isActive,
  subscription,
}: WriteBranchPlanInput): Promise<void> {
  const branch = await getBranch({ db, restaurantId, branchId });

  await db.batch([
    subscription,
    updateBranchPlanStatement({ db, restaurantId, branchId, planCode }),
    ...(isActive === undefined ? [] : [setBranchActiveStatement({ db, restaurantId, branchId, isActive })]),
  ]);

  const themeChanged = branch?.customDomain
    ? await syncBasicThemeFlag({ env, host: branch.customDomain, planCode })
    : false;

  // The public menu strips Business content by this branch's plan, so its cached pages must refresh.
  const activeChanged = isActive !== undefined && branch?.isActive !== isActive;
  if (branch?.planCode !== planCode || activeChanged || themeChanged) {
    await bumpPublicContentVersionForBranch({ db, env, restaurantId, branchId });
  }
}

interface SyncBasicThemeFlagInput {
  env: RuntimeEnv;
  host: string;
  planCode: PlanCode;
}

/**
 * Basic branches render the fixed `qmenut` look. The flag lives in the KV theme so the stored
 * custom theme survives untouched for a re-upgrade. Idempotent: it writes only when the flag is
 * out of date, so a webhook retry after a failed write still converges. Returns whether it wrote.
 */
export async function syncBasicThemeFlag({ env, host, planCode }: SyncBasicThemeFlagInput): Promise<boolean> {
  const plan = planCode === "basic" ? "basic" : undefined;
  const theme = await getTheme(env, host);

  if (theme?.plan === plan || (!theme && !plan)) {
    return false;
  }

  await putTheme({ config: { ...(theme ?? buildDefaultTenantThemeConfig("qmenut")), plan }, env, host });
  return true;
}
