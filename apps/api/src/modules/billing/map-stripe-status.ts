import type { SubscriptionStatus } from "@qmenut/db/repositories/billing.repository";
import type Stripe from "stripe";

/**
 * Mapea los estados de Stripe sobre el enum de 4 valores de branch_subscriptions
 * (limitado por un CHECK en la DB). Se pierde el matiz de "incomplete" (se muestra
 * como past_due), aceptable para MVP1.
 */
export function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
    case "incomplete":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
    case "paused":
      return "canceled";
    default:
      return "canceled";
  }
}
