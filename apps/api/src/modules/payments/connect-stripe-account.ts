import { getRestaurantStripeAccount, insertRestaurantStripeAccount } from "@qmenut/db/repositories/payments.repository";
import { getRestaurantById } from "@qmenut/db/repositories/restaurants.repository";
import { TRPCError } from "@trpc/server";

import { StripeProvider } from "../../lib/stripe/stripe-provider";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";
import type Stripe from "stripe";

// Restaurants store ISO alpha-3; Stripe takes alpha-2. Venezuela is not a Stripe country.
// ponytail: one entry per market; add a country here when a tenant market is Stripe-supported.
const STRIPE_COUNTRIES: Partial<Record<string, string>> = { ESP: "ES" };

export function stripeCountryFor(countryCode: string): string | null {
  return STRIPE_COUNTRIES[countryCode] ?? null;
}

interface ConnectStripeAccountInput {
  db: DrizzleDb;
  env: RuntimeEnv;
  restaurantId: string;
  userEmail: string;
}

/**
 * Creates the restaurant's own Stripe account once and returns a Stripe-hosted onboarding link.
 * Stripe collects identity and bank details, so onboarding needs no operator work, and the
 * restaurant only ever has an `acct_…` id: qmenut acts on it with its platform key.
 */
export async function connectStripeAccount({
  db,
  env,
  restaurantId,
  userEmail,
}: ConnectStripeAccountInput): Promise<{ url: string }> {
  const restaurant = await getRestaurantById({ db, restaurantId });

  if (!restaurant) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Restaurante no encontrado" });
  }

  const country = stripeCountryFor(restaurant.countryCode);

  if (!country) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Stripe no está disponible en el país del restaurante",
    });
  }

  const stripe = StripeProvider.getInstance().getClient(env);
  const existing = await getRestaurantStripeAccount({ db, restaurantId });
  const stripeAccountId =
    existing?.stripeAccountId ??
    (await createStripeAccount({ db, stripe, restaurantId, country, email: userEmail, name: restaurant.name }));

  const link = await stripe.v2.core.accountLinks.create({
    account: stripeAccountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["merchant"],
        refresh_url: `${env.ADMIN_APP_URL}/billing?connect=refresh`,
        return_url: `${env.ADMIN_APP_URL}/billing?connect=return`,
      },
    },
  });

  return { url: link.url };
}

interface CreateStripeAccountInput {
  db: DrizzleDb;
  stripe: Stripe;
  restaurantId: string;
  country: string;
  email: string;
  name: string;
}

async function createStripeAccount({
  db,
  stripe,
  restaurantId,
  country,
  email,
  name,
}: CreateStripeAccountInput): Promise<string> {
  // Accounts v2: Stripe refuses v1 account creation for new Connect platforms.
  const account = await stripe.v2.core.accounts.create(
    {
      contact_email: email,
      display_name: name,
      identity: { country },
      // The restaurant gets the full Stripe dashboard, pays Stripe's fees,
      // and Stripe (not qmenut) carries disputes and negative balances.
      dashboard: "full",
      defaults: { responsibilities: { fees_collector: "stripe", losses_collector: "stripe" } },
      configuration: { merchant: { capabilities: { card_payments: { requested: true } } } },
      metadata: { restaurantId },
    },
    { idempotencyKey: `connected-account:${restaurantId}` },
  );

  const persisted = await insertRestaurantStripeAccount({ db, restaurantId, stripeAccountId: account.id });

  return persisted.stripeAccountId;
}
