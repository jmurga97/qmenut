import { listBranchPlanCodes } from "@qmenut/db/repositories/admin-branches.repository";
import { getBranchSubscription } from "@qmenut/db/repositories/billing.repository";
import { getRestaurantById } from "@qmenut/db/repositories/restaurants.repository";
import { TRPCError } from "@trpc/server";
import Stripe from "stripe";

import { getOrCreateStripeCustomer } from "./get-or-create-customer";
import { founderSlotsLeft } from "../../lib/billing/founders";
import { priceIdFor } from "../../lib/billing/plan-catalog";
import { StripeProvider } from "../../lib/stripe/stripe-provider";
import { assertBranchAccess } from "../admin-tenant/assert-branch-access";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";
import type { PlanCode } from "@qmenut/db/repositories/billing.repository";

const BLOCKING_STATUSES = new Set(["active", "trialing", "past_due"]);
const TRIAL_DAYS = 14;

interface CreateCheckoutSessionInput {
  db: DrizzleDb;
  env: RuntimeEnv;
  restaurantId: string;
  userEmail: string;
  branchId: string;
  planCode: PlanCode;
}

interface AssertPlanAllowedInput {
  db: DrizzleDb;
  restaurantId: string;
  planCode: PlanCode;
}

/** Basic is a single-location plan: a restaurant with several branches stays on Business. */
export async function assertPlanAllowed({ db, restaurantId, planCode }: AssertPlanAllowedInput): Promise<void> {
  if (planCode !== "basic") return;

  const branchPlans = await listBranchPlanCodes({ db, restaurantId });

  if (branchPlans.length > 1) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "El plan Básico es para restaurantes con una sola sucursal" });
  }
}

export async function createCheckoutSession({
  db,
  env,
  restaurantId,
  userEmail,
  branchId,
  planCode,
}: CreateCheckoutSessionInput): Promise<{ url: string }> {
  await assertBranchAccess({ db, restaurantId, branchId });
  await assertPlanAllowed({ db, restaurantId, planCode });

  const existing = await getBranchSubscription({ db, restaurantId, branchId });

  // Operator-created tenants carry a trialing row without a Stripe subscription; only a real one blocks.
  if (existing?.stripeSubscriptionId && BLOCKING_STATUSES.has(existing.status)) {
    throw new TRPCError({ code: "CONFLICT", message: "La sucursal ya tiene una suscripción activa" });
  }

  const restaurant = await getRestaurantById({ db, restaurantId });

  if (!restaurant) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Restaurante no encontrado" });
  }

  // Stripe does not serve Venezuela: those plans are paid to the team and activated from Lab.
  if (restaurant.countryCode === "VEN") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "En Venezuela el plan se activa con el equipo de QMenut",
    });
  }

  const customer = await getOrCreateStripeCustomer({
    db,
    env,
    restaurantId,
    restaurantName: restaurant.name,
    email: userEmail,
  });

  const stripe = StripeProvider.getInstance().getClient(env);
  const priceId = priceIdFor(env, planCode);
  // A demo or a staff-activated plan already had its free days; only a branch that never tried pays later.
  const hadTrial = Boolean(existing?.stripeSubscriptionId) || typeof existing?.currentPeriodEnd === "number";
  // ponytail: a place is taken when the webhook lands, so two checkouts racing for the last one both get it.
  const founder =
    planCode === "business" && env.STRIPE_COUPON_FOUNDER !== undefined && (await founderSlotsLeft(db)) > 0;
  const metadata = { restaurantId, branchId, planCode, ...(founder ? { founder: "true" } : {}) };

  let session: Stripe.Checkout.Session;

  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer,
        line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: branchId,
        subscription_data: {
          metadata,
          // One free trial per branch.
          trial_period_days: hadTrial ? undefined : TRIAL_DAYS,
        },
        ...(founder ? { discounts: [{ coupon: env.STRIPE_COUPON_FOUNDER }] } : {}),
        metadata,
        success_url: `${env.ADMIN_APP_URL}/billing?checkout=success`,
        cancel_url: `${env.ADMIN_APP_URL}/billing?checkout=canceled`,
      },
      {
        // Scoped to branch and plan: plan changes after checkout belong in the Customer Portal.
        // Stripe retains idempotency keys for 24 hours, so repeating the same plan's checkout
        // in that window with different parameters is reported as a conflict.
        idempotencyKey: `checkout:${branchId}:${planCode}:${founder ? "founder" : "list"}`,
      },
    );
  } catch (error) {
    if (error instanceof Stripe.errors.StripeIdempotencyError) {
      throw new TRPCError({ code: "CONFLICT", message: "checkout ya en curso" });
    }

    throw error;
  }

  if (!session.url) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe no devolvió una URL de checkout" });
  }

  return { url: session.url };
}
