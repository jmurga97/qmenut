# Payments (Stripe Connect)

This page describes how a restaurant gets paid by its diners: through its own Stripe
account, connected to qmenut with Stripe Connect. It is the foundation for delivery and
pickup, and for any later feature that takes money from diners.

Billing ([Billing](billing.md)) is the other direction: the restaurant paying qmenut's
monthly fee. The two never mix. The monthly fee stays on qmenut's own Stripe account.

## Status

Onboarding only. An owner can connect a Stripe account from the Billing page, and the
admin shows its status. Nothing charges diners yet; delivery is the first consumer.

## Model

- Each restaurant gets a connected account created with Accounts v2
  (`stripe.v2.core.accounts`), because Stripe refuses v1 account creation for new Connect
  platforms. It uses `dashboard: "full"`, `fees_collector: "stripe"`,
  `losses_collector: "stripe"`, and the `merchant` configuration with `card_payments`.
  - The restaurant uses the full Stripe dashboard and signs in to Stripe directly.
  - Stripe bills its processing fees to the restaurant.
  - Stripe, not qmenut, carries disputes and negative balances.
  - Stripe-hosted onboarding collects identity and bank details, so connecting needs no
    operator work.
- Charges are direct charges on the restaurant's account, with no `application_fee_amount`.
  qmenut earns only the monthly subscription.
- **No secret per restaurant.** qmenut stores only the `acct_…` id and acts on the account
  with its existing platform key (`STRIPE_SECRET_KEY`) through the `{ stripeAccount }`
  request option.

## Data model

`restaurant_stripe_accounts` (`packages/db/src/schema/tenancy.ts`) holds one row per
restaurant: `stripe_account_id` and a `status` of `pending`, `connected`, or `disabled`.

| Status      | Meaning                                                                     |
| ----------- | --------------------------------------------------------------------------- |
| `pending`   | Onboarding not finished, or Stripe needs more information. Charges are off. |
| `connected` | The merchant `card_payments` capability is `active`.                        |
| `disabled`  | The account is closed, or Stripe marks `card_payments` as `unsupported`.    |

## Flow

1. The owner clicks "Conectar Stripe" on the Billing page. `admin.payments.connect` creates
   the account once (idempotency key `connected-account:<restaurantId>`), stores it as
   `pending`, and returns a Stripe-hosted onboarding link.
2. Stripe sends the owner back to `/billing?connect=return`. If the link has expired, it
   sends them to `/billing?connect=refresh`, where the card offers "Continuar en Stripe".
3. `admin.payments.account` reads the account from Stripe on each visit and stores the new
   status when it changed. A 403 from Stripe means the owner disconnected qmenut, so the
   row is deleted and the card offers to connect again.

Both procedures require `billing.manage`, so only owners can use them.

## Supported countries

Restaurants store an ISO alpha-3 country code; Stripe takes alpha-2. `stripeCountryFor` in
`connect-stripe-account.ts` maps the supported ones (`ESP` → `ES`). For other countries,
Venezuela among them, the card is hidden and `connect` is refused. Add a country there
when a tenant market is supported by Stripe.

## Charging a diner (for delivery)

```ts
const account = await getRestaurantStripeAccount({ db, restaurantId });
if (account?.status !== "connected") {
  // online payment is unavailable for this restaurant
}
await stripe.checkout.sessions.create(params, { stripeAccount: account.stripeAccountId });
```

Delivery adds the Connect webhook alongside its checkout:

- Path `POST /webhooks/stripe-connect`, registered in Stripe as an endpoint that listens
  to connected accounts. `event.account` names the restaurant's account.
- One platform secret, `STRIPE_CONNECT_WEBHOOK_SECRET`, set once per environment.
- Events: `checkout.session.completed` (the order is paid), `account.updated`, and
  `account.application.deauthorized`. Once `account.updated` keeps the status current,
  remove the sync on read from `get-payments-account.ts`.

## Key files

| Concern          | Path                                                      |
| ---------------- | --------------------------------------------------------- |
| Router           | `apps/api/src/modules/payments/payments.router.ts`        |
| Connect and link | `apps/api/src/modules/payments/connect-stripe-account.ts` |
| Status sync      | `apps/api/src/modules/payments/get-payments-account.ts`   |
| Repository       | `packages/db/src/repositories/payments.repository.ts`     |
| Admin card       | `apps/admin/src/features/billing/pages/billing-page.tsx`  |

## Setup

Connect must be enabled once per Stripe mode before `accounts.create` works. See Step 8
of [Deployment](../operations/deployment.md).
