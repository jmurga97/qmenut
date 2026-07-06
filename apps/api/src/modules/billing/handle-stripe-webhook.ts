import { syncSubscriptionState } from "./sync-subscription-state";
import { StripeProvider } from "../../lib/stripe/stripe-provider";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db";
import type Stripe from "stripe";

interface HandleStripeWebhookInput {
  request: Request;
  env: RuntimeEnv;
  db: DrizzleDb;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Endpoint raw (fuera de tRPC: la verificación de firma necesita el cuerpo sin
 * parsear). Todos los eventos de suscripción convergen en syncSubscriptionState.
 */
export async function handleStripeWebhook({ request, env, db }: HandleStripeWebhookInput): Promise<Response> {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return jsonResponse({ error: "Missing signature" }, 400);
  }

  const provider = StripeProvider.getInstance();
  const stripe = provider.getClient(env);
  const payload = await request.text();

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
      undefined,
      provider.getWebhookCryptoProvider(),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid signature";
    return jsonResponse({ error: message }, 400);
  }

  await dispatchEvent({ db, env, stripe, event });

  return jsonResponse({ received: true }, 200);
}

interface DispatchEventInput {
  db: DrizzleDb;
  env: RuntimeEnv;
  stripe: Stripe;
  event: Stripe.Event;
}

async function dispatchEvent({ db, env, stripe, event }: DispatchEventInput): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (typeof session.subscription === "string") {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        await syncSubscriptionState({ db, env, subscription });
      }
      return;
    }
    case "customer.subscription.updated": {
      // Re-recupera para neutralizar el desorden de entrega de eventos.
      const subscription = await stripe.subscriptions.retrieve(event.data.object.id);
      await syncSubscriptionState({ db, env, subscription });
      return;
    }
    case "customer.subscription.deleted": {
      await syncSubscriptionState({ db, env, subscription: event.data.object });
      return;
    }
    case "invoice.payment_failed": {
      const subscriptionId = resolveInvoiceSubscriptionId(event.data.object);
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await syncSubscriptionState({ db, env, subscription });
      }
      return;
    }
    default:
      return;
  }
}

/**
 * La referencia a la suscripción en la factura ha cambiado de sitio entre versiones
 * de la API de Stripe (top-level `subscription` vs `parent.subscription_details`).
 * Leemos ambas de forma defensiva; este handler es solo un atajo, ya que
 * customer.subscription.updated cubre igualmente la transición a past_due.
 */
function resolveInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const legacy = (invoice as { subscription?: string | { id: string } | null }).subscription;

  if (typeof legacy === "string") {
    return legacy;
  }

  if (legacy && typeof legacy === "object") {
    return legacy.id;
  }

  const parentSubscription = invoice.parent?.subscription_details?.subscription;

  if (typeof parentSubscription === "string") {
    return parentSubscription;
  }

  if (parentSubscription && typeof parentSubscription === "object") {
    return parentSubscription.id;
  }

  return null;
}
