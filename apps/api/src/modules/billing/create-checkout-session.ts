import { TRPCError } from "@trpc/server";
import { getBranchSubscription } from "@qmenut/db/repositories/billing.repository";
import { getRestaurantById } from "@qmenut/db/repositories/restaurants.repository";

import { getOrCreateStripeCustomer } from "./get-or-create-customer";
import { assertBranchAccess } from "../admin-tenant/assert-branch-access";
import { PlanCatalog } from "../../lib/billing/plan-catalog";
import { StripeProvider } from "../../lib/stripe/stripe-provider";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db";
import type { PlanCode } from "@qmenut/db/repositories/billing.repository";

const BLOCKING_STATUSES = new Set(["active", "trialing", "past_due"]);

interface CreateCheckoutSessionInput {
  db: DrizzleDb;
  env: RuntimeEnv;
  restaurantId: string;
  userEmail: string;
  branchId: string;
  planCode: PlanCode;
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

  const existing = await getBranchSubscription({ db, restaurantId, branchId });

  if (existing && BLOCKING_STATUSES.has(existing.status)) {
    throw new TRPCError({ code: "CONFLICT", message: "La sucursal ya tiene una suscripción activa" });
  }

  const restaurant = await getRestaurantById({ db, restaurantId });

  if (!restaurant) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Restaurant not found" });
  }

  const customer = await getOrCreateStripeCustomer({
    db,
    env,
    restaurantId,
    restaurantName: restaurant.name,
    email: userEmail,
  });

  const stripe = StripeProvider.getInstance().getClient(env);
  const priceId = PlanCatalog.getInstance().priceIdFor(env, planCode);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: branchId,
    subscription_data: {
      metadata: { restaurantId, branchId, planCode },
    },
    metadata: { restaurantId, branchId, planCode },
    success_url: `${env.ADMIN_APP_URL}/billing?checkout=success`,
    cancel_url: `${env.ADMIN_APP_URL}/billing?checkout=canceled`,
  });

  if (!session.url) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe no devolvió una URL de checkout" });
  }

  return { url: session.url };
}
