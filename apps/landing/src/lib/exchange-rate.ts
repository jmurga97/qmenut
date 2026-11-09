import { env } from "cloudflare:workers";

type LatestRates =
  | { success: true; data: { rates: { currency: string; rate: string }[] } }
  | { success: false; error: { message: string } };
type ExchangeRateWorker = { getLatestRates(input?: { currencies: string[] }): Promise<LatestRates> };

// The demo menu's own fixture rate: shown when the worker binding is missing (local dev) or fails.
const FIXTURE_RATE = 35;

/** Today's BCV bolívares per dollar from ming-exchange-rate-worker, for the Venezuelan rate animation. */
export async function getUsdRate(): Promise<number> {
  const worker = (env as { EXCHANGE_RATE_WORKER?: ExchangeRateWorker }).EXCHANGE_RATE_WORKER;
  if (!worker) return FIXTURE_RATE;
  try {
    const result = await worker.getLatestRates({ currencies: ["USD"] });
    const rate = result.success ? Number(result.data.rates.find((item) => item.currency === "USD")?.rate) : NaN;
    return rate > 0 ? rate : FIXTURE_RATE;
  } catch (error) {
    console.error("No se pudo leer la tasa del BCV", { error });
    return FIXTURE_RATE;
  }
}
