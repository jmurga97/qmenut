import {
  deleteRestaurantStripeAccount,
  getRestaurantStripeAccount,
  updateRestaurantStripeAccountStatus,
} from "@qmenut/db/repositories/payments.repository";
import { getRestaurantById } from "@qmenut/db/repositories/restaurants.repository";
import Stripe from "stripe";

import { stripeCountryFor } from "./connect-stripe-account";
import { StripeProvider } from "../../lib/stripe/stripe-provider";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";
import type { StripeAccountStatus } from "@qmenut/db/repositories/payments.repository";

export interface PaymentsAccount {
  /** False where Stripe cannot onboard the restaurant's country. */
  available: boolean;
  status: StripeAccountStatus | null;
}

interface GetPaymentsAccountInput {
  db: DrizzleDb;
  env: RuntimeEnv;
  restaurantId: string;
}

function statusFor(account: Stripe.V2.Core.Account): StripeAccountStatus {
  const cardPayments = account.configuration?.merchant?.capabilities?.card_payments?.status;

  if (cardPayments === "active") return "connected";

  return account.closed || cardPayments === "unsupported" ? "disabled" : "pending";
}

/**
 * Reads the restaurant's Connect account and refreshes its stored status from Stripe.
 * ponytail: syncs on read; the Connect webhook that delivery adds (account.updated) replaces it.
 */
export async function getPaymentsAccount({ db, env, restaurantId }: GetPaymentsAccountInput): Promise<PaymentsAccount> {
  const [restaurant, stored] = await Promise.all([
    getRestaurantById({ db, restaurantId }),
    getRestaurantStripeAccount({ db, restaurantId }),
  ]);
  const available = restaurant ? stripeCountryFor(restaurant.countryCode) !== null : false;

  if (!stored) {
    return { available, status: null };
  }

  let account: Stripe.V2.Core.Account;

  try {
    account = await StripeProvider.getInstance()
      .getClient(env)
      .v2.core.accounts.retrieve(stored.stripeAccountId, { include: ["configuration.merchant"] });
  } catch (error) {
    // Stripe answers 403 once the owner disconnects qmenut: forget the account so they can connect again.
    if (error instanceof Stripe.errors.StripePermissionError) {
      await deleteRestaurantStripeAccount({ db, restaurantId });
      return { available, status: null };
    }

    throw error;
  }

  const status = statusFor(account);

  if (status !== stored.status) {
    await updateRestaurantStripeAccountStatus({ db, restaurantId, status });
  }

  return { available, status };
}
