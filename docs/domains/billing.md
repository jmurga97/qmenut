# Billing and subscriptions

This page describes SaaS billing with Stripe: one subscription per branch, kept in sync by
webhooks.

This page is partial. It states the purpose, the structure, and the key files, but does
not yet contain a full walkthrough.

## Status

Two plans, `basic` and `business`, each configured through an environment price ID. Every
plan starts with a 14-day trial and a card collected up front. Subscription state is kept in
sync by Stripe webhooks. The code notes an intention to move plans into a database table
later. What each plan includes is defined in `docs/sales/plan-features.md`.

## Data model

- `packages/db/src/schema/billing.ts` defines `stripe_customers`.
- `packages/db/src/schema/restaurants.ts` defines `branch_subscriptions`, which holds one
  Stripe subscription per branch with a `status` of `trialing`, `active`, `past_due`, or
  `canceled`, and `restaurant_stripe_accounts`, which holds the Stripe Connect account per
  restaurant (see [Payments](payments.md)).
- `branches.plan_code` holds the branch's effective plan. `syncSubscriptionState` writes it
  (a canceled subscription falls back to `basic`), and every plan check reads it.
- `PlanCode` comes from `@qmenut/permissions` and is re-exported by
  `packages/db/src/repositories/billing.repository.ts`.

## Plans and entitlements

- `packages/permissions/src/index.ts` maps each plan to its Business-only feature keys
  (`PLAN_FEATURES`, `hasFeature`). Basic has none of them.
- Branch features follow that branch's plan. Restaurant features (`RESTAURANT_FEATURES`:
  languages, loyalty, analytics, users) are on when any branch of the restaurant has them.
- `apps/api/src/lib/billing/entitlement.ts` provides `requireFeature` and `hasPlanFeature`.
  Restaurant-wide routers use `featureProcedure(feature)` from `apps/api/src/trpc/trpc.ts`.
- On Basic, non-owner members lose access (support accounts are exempt), DeepL
  retranslation is skipped and the analytics digest is not sent.
- The public menu (`get-public-menu.ts`) leaves Business content out for a Basic branch,
  and `publicFeatures` tells the web which pages and the manifest to serve.
- Downgrades never delete data. Stored promotions, languages, schedules, featured flags and
  extra photos stay in D1 and come back on upgrade; menu writes on Basic keep the stored
  schedule and featured flags.
- A change of effective plan bumps the branch's public content version, so cached pages
  refresh.

## Backend

- Router. `apps/api/src/modules/billing/billing.router.ts` provides `overview`,
  `checkout`, `changePlan`, and `portal`, built on `tenantProcedure`. Billing writes are
  restricted to owners.
- Checkout. `checkout` accepts either plan. A branch that never had a Stripe subscription
  gets the 14-day trial. The `trialing` rows that `qmenut-ops` creates without a Stripe
  subscription do not block checkout. Basic is refused for restaurants with more than one
  branch.
- Plan switching. `changePlan` checks the same rules, then opens the Customer Portal on its
  `subscription_update_confirm` flow for the new price. Stripe shows the proration and the
  webhook applies the change. The portal configuration must allow switching between both
  products.
- Handlers. `create-checkout-session.ts`, `create-portal-session.ts`,
  `get-billing-overview.ts`, `get-or-create-customer.ts`, `handle-stripe-webhook.ts`,
  `sync-subscription-state.ts`, and `map-stripe-status.ts`.
- Webhook entry point. `apps/api/src/index.ts` routes `POST /webhooks/stripe` to
  `handleStripeWebhook`. All subscription events converge in `syncSubscriptionState`.
- Infrastructure singletons. `apps/api/src/lib/stripe/stripe-provider.ts`,
  `apps/api/src/lib/billing/plan-catalog.ts`, which maps `basic` to `STRIPE_PRICE_BASIC`
  and `business` to `STRIPE_PRICE_BUSINESS`, and `apps/api/src/lib/billing/entitlement.ts`.

## Frontend

The admin route `apps/admin/src/app/routes/_auth.billing.tsx` offers both plans per branch
(trial, subscribe or switch) and links to the Stripe Customer Portal. Locked sections keep
their nav entry with a "Business" label and render `PlanLockedState`; inline controls use
`PlanLock` (`apps/admin/src/shared/components/state/plan-locked-state.tsx`).

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
- Plans are configured through environment variables named `STRIPE_PRICE_*` in every
  Wrangler environment. Moving them into a database table is a known future step.
- The webhook recognises only the configured price of each plan. Adding a second price to a
  plan (annual billing, a price rise) needs `planCodeFor` to map by product instead.
- Price IDs are per Stripe mode: production needs live prices, a live secret key and a live
  webhook secret together.
