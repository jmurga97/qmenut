import { getBranchSubscription, getStripeCustomer } from "@qmenut/db/repositories/billing.repository";
import { TRPCError } from "@trpc/server";

import { assertPlanAllowed } from "./create-checkout-session";
import { priceIdFor } from "../../lib/billing/plan-catalog";
import { StripeProvider } from "../../lib/stripe/stripe-provider";
import { assertBranchAccess } from "../admin-tenant/assert-branch-access";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";
import type { PlanCode } from "@qmenut/db/repositories/billing.repository";

interface CreatePortalSessionInput {
  db: DrizzleDb;
  env: RuntimeEnv;
  restaurantId: string;
}

export async function createPortalSession({
  db,
  env,
  restaurantId,
}: CreatePortalSessionInput): Promise<{ url: string }> {
  const customer = await getStripeCustomer({ db, restaurantId });

  if (!customer) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Todavía no hay ninguna suscripción" });
  }

  const stripe = StripeProvider.getInstance().getClient(env);
  const session = await stripe.billingPortal.sessions.create({
    customer: customer.stripeCustomerId,
    return_url: `${env.ADMIN_APP_URL}/billing`,
  });

  return { url: session.url };
}

interface CreatePlanChangeSessionInput extends CreatePortalSessionInput {
  branchId: string;
  planCode: PlanCode;
}

/**
 * Validates the switch here (Stripe cannot know the one-branch rule), then lets the Customer
 * Portal show the proration and confirm it. The webhook applies the new plan.
 */
export async function createPlanChangeSession({
  db,
  env,
  restaurantId,
  branchId,
  planCode,
}: CreatePlanChangeSessionInput): Promise<{ url: string }> {
  await assertBranchAccess({ db, restaurantId, branchId });
  await assertPlanAllowed({ db, restaurantId, planCode });

  const [subscription, customer] = await Promise.all([
    getBranchSubscription({ db, restaurantId, branchId }),
    getStripeCustomer({ db, restaurantId }),
  ]);

  if (!subscription?.stripeSubscriptionId || subscription.status === "canceled" || !customer) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "La sucursal no tiene una suscripción activa" });
  }

  if (subscription.planCode === planCode) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "La sucursal ya está en ese plan" });
  }

  const stripe = StripeProvider.getInstance().getClient(env);
  const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
  const item = stripeSubscription.items.data[0];

  if (!item) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "La suscripción de Stripe no tiene ningún plan" });
  }

  const returnUrl = `${env.ADMIN_APP_URL}/billing`;
  const session = await stripe.billingPortal.sessions.create({
    customer: customer.stripeCustomerId,
    return_url: returnUrl,
    flow_data: {
      type: "subscription_update_confirm",
      subscription_update_confirm: {
        subscription: stripeSubscription.id,
        items: [{ id: item.id, price: priceIdFor(env, planCode), quantity: 1 }],
      },
      after_completion: { type: "redirect", redirect: { return_url: `${returnUrl}?plan=changed` } },
    },
  });

  return { url: session.url };
}
