import { getStripeCustomer, insertStripeCustomer } from "@qmenut/db/repositories/billing.repository";

import { StripeProvider } from "../../lib/stripe/stripe-provider";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db";

interface GetOrCreateCustomerInput {
  db: DrizzleDb;
  env: RuntimeEnv;
  restaurantId: string;
  restaurantName: string;
  email: string;
}

/** Devuelve el customer Stripe del restaurante, creándolo (y persistiéndolo) si no existe. */
export async function getOrCreateStripeCustomer({
  db,
  env,
  restaurantId,
  restaurantName,
  email,
}: GetOrCreateCustomerInput): Promise<string> {
  const existing = await getStripeCustomer({ db, restaurantId });

  if (existing) {
    return existing.stripeCustomerId;
  }

  const stripe = StripeProvider.getInstance().getClient(env);
  const customer = await stripe.customers.create({
    email,
    name: restaurantName,
    metadata: { restaurantId },
  });

  await insertStripeCustomer({ db, restaurantId, stripeCustomerId: customer.id });

  return customer.id;
}
