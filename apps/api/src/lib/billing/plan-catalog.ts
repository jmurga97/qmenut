import type { RuntimeEnv } from "../../config/env/schema";
import type { PlanCode } from "@qmenut/db/repositories/billing.repository";

/**
 * Catálogo de planes: mapea el plan básico al price id de Stripe. Hoy sobre una
 * variable de entorno; estas funciones son la costura para migrar a una tabla de
 * planes en el futuro sin tocar el resto del dominio.
 */
export function priceIdFor(env: RuntimeEnv): string {
  return env.STRIPE_PRICE_BASIC;
}

export function planCodeFor(env: RuntimeEnv, priceId: string): PlanCode | null {
  if (priceId === env.STRIPE_PRICE_BASIC) {
    return "basic";
  }

  return null;
}
