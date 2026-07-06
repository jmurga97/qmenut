import Stripe from "stripe";

import type { RuntimeEnv } from "../../config/env/schema";

const STRIPE_API_VERSION = "2025-10-29.clover";

/**
 * Suministrador del cliente Stripe (patrón singleton para infraestructura).
 * Usa el HTTP client basado en fetch y el proveedor de cripto de SubtleCrypto,
 * ambos compatibles con Cloudflare Workers. El cliente se cachea por secret para
 * sobrevivir entre requests dentro del mismo isolate.
 */
export class StripeProvider {
  private static instance: StripeProvider | null = null;
  private client: Stripe | null = null;
  private cachedSecret: string | null = null;
  private cryptoProvider: Stripe.CryptoProvider | null = null;

  static getInstance(): StripeProvider {
    if (!StripeProvider.instance) {
      StripeProvider.instance = new StripeProvider();
    }

    return StripeProvider.instance;
  }

  getClient(env: RuntimeEnv): Stripe {
    if (this.client && this.cachedSecret === env.STRIPE_SECRET_KEY) {
      return this.client;
    }

    this.client = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_API_VERSION,
      httpClient: Stripe.createFetchHttpClient(),
    });
    this.cachedSecret = env.STRIPE_SECRET_KEY;

    return this.client;
  }

  getWebhookCryptoProvider(): Stripe.CryptoProvider {
    if (!this.cryptoProvider) {
      this.cryptoProvider = Stripe.createSubtleCryptoProvider();
    }

    return this.cryptoProvider;
  }
}
