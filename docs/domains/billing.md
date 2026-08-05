# Billing & subscriptions 🧩

> **Stub** — Purpose + key files below; expand when needed.
> Follows the [doc template](../README.md#the-doc-template).

## Purpose & status

✅ Complete for MVP1. SaaS billing with **Stripe**, one subscription **per branch**.
One plan (`basic`) configured via an env price id. State is kept in sync by
Stripe webhooks. MVP1 uses env-configured plans; the code notes an intent to migrate to
a plans table later.

## Data model

- `packages/db/src/schema/billing.ts` — `stripe_customers`.
- Subscription/account state in `packages/db/src/schema/restaurants.ts` —
  `branch_subscriptions` (Stripe subscription per branch; `status`
  `trialing|active|past_due|canceled`) and `restaurant_stripe_accounts` (Stripe
  Connect per restaurant).
- Repo: `packages/db/src/repositories/billing.repository.ts` (defines `PlanCode`).

## Backend

- Router: `apps/api/src/modules/billing/billing.router.ts` — `overview`, `checkout`,
  `portal`. `tenantProcedure` (billing writes are owner-only).
- Handlers: `create-checkout-session.ts`, `create-portal-session.ts`,
  `get-billing-overview.ts`, `get-or-create-customer.ts`, `handle-stripe-webhook.ts`,
  `sync-subscription-state.ts`, `map-stripe-status.ts`.
- Webhook entry: `apps/api/src/index.ts` routes `POST /webhooks/stripe` →
  `handleStripeWebhook`. All subscription events converge in `syncSubscriptionState`.
- Infra singletons: `apps/api/src/lib/stripe/stripe-provider.ts`,
  `apps/api/src/lib/billing/plan-catalog.ts` (maps `basic`→`STRIPE_PRICE_BASIC`,
  `apps/api/src/lib/billing/entitlement.ts`.

## Frontend

- Admin: `apps/admin/src/app/routes/_auth.billing.tsx` (Checkout + Customer Portal).

## Key files

| Concern | Path |
|---|---|
| Billing schema | `packages/db/src/schema/billing.ts`, `.../restaurants.ts` (`branch_subscriptions`, `restaurant_stripe_accounts`) |
| Billing router + handlers | `apps/api/src/modules/billing/` |
| Stripe webhook entry | `apps/api/src/index.ts` (`/webhooks/stripe`) |
| Stripe provider / plans / entitlement | `apps/api/src/lib/stripe/`, `apps/api/src/lib/billing/` |
| Repo | `packages/db/src/repositories/billing.repository.ts` |
| Admin UI | `apps/admin/src/app/routes/_auth.billing.tsx` |

## Notes & gotchas

- **Webhook-driven state.** Never infer subscription state from the checkout response;
  it converges in `syncSubscriptionState` from webhook events.
- Plans are env-configured for MVP1 (`STRIPE_PRICE_*`); migrating to a DB plans table is
  a known future step.
