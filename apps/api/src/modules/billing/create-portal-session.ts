import { TRPCError } from "@trpc/server";
import { getStripeCustomer } from "@qmenut/db/repositories/billing.repository";

import { StripeProvider } from "../../lib/stripe/stripe-provider";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db";

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
