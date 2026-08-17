# Billing and subscriptions

This page describes SaaS billing with Stripe: one subscription per branch, kept in sync by
webhooks.

This page is partial. It states the purpose, the structure, and the key files, but does
not yet contain a full walkthrough.

## Status

Complete for MVP1. There is one plan, `basic`, configured through an environment price ID.
Subscription state is kept in sync by Stripe webhooks. The code notes an intention to move
plans into a database table later.

## Data model

- `packages/db/src/schema/billing.ts` defines `stripe_customers`.
- `packages/db/src/schema/restaurants.ts` defines `branch_subscriptions`, which holds one
  Stripe subscription per branch with a `status` of `trialing`, `active`, `past_due`, or
  `canceled`, and `restaurant_stripe_accounts`, which holds the Stripe Connect account per
  restaurant.
- `packages/db/src/repositories/billing.repository.ts` defines `PlanCode`.

## Backend

- Router. `apps/api/src/modules/billing/billing.router.ts` provides `overview`,
  `checkout`, and `portal`, built on `tenantProcedure`. Billing writes are restricted to
  owners.
- Handlers. `create-checkout-session.ts`, `create-portal-session.ts`,
  `get-billing-overview.ts`, `get-or-create-customer.ts`, `handle-stripe-webhook.ts`,
  `sync-subscription-state.ts`, and `map-stripe-status.ts`.
- Webhook entry point. `apps/api/src/index.ts` routes `POST /webhooks/stripe` to
  `handleStripeWebhook`. All subscription events converge in `syncSubscriptionState`.
- Infrastructure singletons. `apps/api/src/lib/stripe/stripe-provider.ts`,
  `apps/api/src/lib/billing/plan-catalog.ts`, which maps `basic` to `STRIPE_PRICE_BASIC`,
  and `apps/api/src/lib/billing/entitlement.ts`.

## Frontend

The admin route `apps/admin/src/app/routes/_auth.billing.tsx` links to Stripe Checkout and
the Stripe Customer Portal.

## Key files

| Concern                                 | Path                                                                                                             |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Billing schema                          | `packages/db/src/schema/billing.ts`, `.../restaurants.ts` (`branch_subscriptions`, `restaurant_stripe_accounts`) |
| Billing router and handlers             | `apps/api/src/modules/billing/`                                                                                  |
| Stripe webhook entry point              | `apps/api/src/index.ts` (`/webhooks/stripe`)                                                                     |
| Stripe provider, plans, and entitlement | `apps/api/src/lib/stripe/`, `apps/api/src/lib/billing/`                                                          |
| Repository                              | `packages/db/src/repositories/billing.repository.ts`                                                             |
| Admin UI                                | `apps/admin/src/app/routes/_auth.billing.tsx`                                                                    |

## Limitations

- Subscription state is webhook-driven. Never infer it from the Checkout response; it
  converges in `syncSubscriptionState` from webhook events.
- Plans are configured through environment variables named `STRIPE_PRICE_*` for MVP1.
  Moving them into a database table is a known future step.
