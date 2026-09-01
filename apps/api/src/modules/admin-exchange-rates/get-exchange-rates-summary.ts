import { getRestaurantExchangeRate } from "@qmenut/db/repositories/restaurant-exchange-rates.repository";
import { getRestaurantById } from "@qmenut/db/repositories/restaurants.repository";

import { calculatePercentageDifference } from "./decimal";
import { getLatestExchangeRates } from "../exchange-rates/exchange-rate-worker.client";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";

export interface ExchangeRateSummary {
  bcvRate: string | null;
  bcvReferenceAt: string | null;
  differencePercent: number | null;
  localRate: string | null;
  vesPricesEnabled: boolean;
}

interface GetExchangeRateSummaryInput {
  db: DrizzleDb;
  env: RuntimeEnv;
  restaurantId: string;
}

async function getBcvReference(env: RuntimeEnv): Promise<{ rate: string; capturedAt: string } | null> {
  if (!env.EXCHANGE_RATE_WORKER) {
    return null;
  }

  try {
    const latest = await getLatestExchangeRates({
      worker: env.EXCHANGE_RATE_WORKER,
      currencies: ["USD"],
    });
    const reference = latest.rates.find((rate) => rate.currency === "USD");

    return reference ? { capturedAt: reference.capturedAt, rate: reference.rate } : null;
  } catch (error) {
    console.error("No se pudo obtener la referencia cambiaria de Ming", error);
    return null;
  }
}

export async function getExchangeRateSummary({
  db,
  env,
  restaurantId,
}: GetExchangeRateSummaryInput): Promise<ExchangeRateSummary | null> {
  const restaurant = await getRestaurantById({ db, restaurantId });

  if (!restaurant) {
    return null;
  }

  const local = await getRestaurantExchangeRate({ db, restaurantId });

  if (restaurant.sourceCurrency !== "USD") {
    return {
      bcvRate: null,
      bcvReferenceAt: null,
      differencePercent: null,
      localRate: null,
      vesPricesEnabled: false,
    };
  }

  const reference = await getBcvReference(env);

  return {
    bcvRate: reference?.rate ?? null,
    bcvReferenceAt: reference?.capturedAt ?? null,
    differencePercent: local?.rate && reference ? calculatePercentageDifference(local.rate, reference.rate) : null,
    localRate: local?.rate ?? null,
    vesPricesEnabled: local?.isEnabled ?? false,
  };
}
