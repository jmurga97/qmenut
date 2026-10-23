import { PLAN_CODES } from "@qmenut/permissions";

import type { RuntimeEnv } from "../../config/env/schema";
import type { PlanCode } from "@qmenut/db/repositories/billing.repository";

/**
 * Catálogo de planes: mapea cada plan a su price id de Stripe. Hoy sobre variables de
 * entorno; estas funciones son la costura para migrar a una tabla de planes en el futuro
 * sin tocar el resto del dominio.
 */
function priceIds(env: RuntimeEnv): Record<PlanCode, string> {
  return { basic: env.STRIPE_PRICE_BASIC, business: env.STRIPE_PRICE_BUSINESS };
}

export function priceIdFor(env: RuntimeEnv, planCode: PlanCode): string {
  return priceIds(env)[planCode];
}

// ponytail: only the configured price per plan is recognised; map by price.product once a plan has several prices (annual, price rise).
export function planCodeFor(env: RuntimeEnv, priceId: string): PlanCode | null {
  const ids = priceIds(env);
  return PLAN_CODES.find((planCode) => ids[planCode] === priceId) ?? null;
}
