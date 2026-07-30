import {
  updateBranchPlanStatement,
  upsertBranchSubscriptionStatement,
} from "@qmenut/db/repositories/billing.repository";

import { mapStripeStatus } from "./map-stripe-status";
import { entitledPlanCode } from "../../lib/billing/entitlement";
import { planCodeFor } from "../../lib/billing/plan-catalog";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";
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

  await db.batch([
    upsertBranchSubscriptionStatement({
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
      },
    }),
    updateBranchPlanStatement({
      db,
      restaurantId,
      branchId,
      planCode: entitledPlanCode(status, planCode),
    }),
  ]);
}
