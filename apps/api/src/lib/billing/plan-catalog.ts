import type { RuntimeEnv } from "../../config/env/schema";
import type { PlanCode } from "@qmenut/db/repositories/billing.repository";

/**
 * Catálogo de planes: mapea plan <-> price id de Stripe. Hoy sobre variables de
 * entorno (dos planes, MVP1); esta clase es la costura para migrar a una tabla de
 * planes en el futuro sin tocar el resto del dominio. Singleton de configuración.
 */
export class PlanCatalog {
  private static instance: PlanCatalog | null = null;

  static getInstance(): PlanCatalog {
    if (!PlanCatalog.instance) {
      PlanCatalog.instance = new PlanCatalog();
    }

    return PlanCatalog.instance;
  }

  priceIdFor(env: RuntimeEnv, planCode: PlanCode): string {
    return planCode === "basic" ? env.STRIPE_PRICE_BASIC : env.STRIPE_PRICE_BUSINESS;
  }

  planCodeFor(env: RuntimeEnv, priceId: string): PlanCode | null {
    if (priceId === env.STRIPE_PRICE_BASIC) {
      return "basic";
    }

    if (priceId === env.STRIPE_PRICE_BUSINESS) {
      return "business";
    }

    return null;
  }
}
