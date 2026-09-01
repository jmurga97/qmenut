# Loyalty

This page describes the rewards program: how diners earn points or stamps, how they
redeem rewards, and how staff validate a redemption in the restaurant.

## Status

Complete and wired end to end, covering the schema, the public API, the admin API, and
both user interfaces. A restaurant runs one loyalty program, based either on points or on
stamps, defines rewards, and lets customers redeem them. Staff validate redemptions in
person using a rotating venue code, so no scanner or camera is required.

The design reasoning is in [Loyalty UX](../design/loyalty-ux.md). Those decisions were
locked on 2026-07-08 and revised on 2026-07-10 to remove QR scanning.

## Data model

The program and its rewards are defined in `packages/db/src/schema/loyalty.ts`:

- `loyalty_programs` (`loyalty.ts:3`) holds one row per restaurant, with `restaurantId`
  as the primary key. `type` is either `points` or `stamps`. The row also holds
  `pointsPerCurrencyUnit`, `pointsPerVisit`, `stampsPerVisit`, and an optional
  `rulesJson`.
- `loyalty_rewards` (`loyalty.ts:15`) holds `cost`, in points or stamps, and `type`. The
  type is `percentage_discount` with a `percentage`, `free_dish` with a `freeDishId`, or
  `special_price` with a `specialPrice`.
- `loyalty_transactions` (`loyalty.ts:35`) is the ledger. `type` is `earn`, `redeem`,
  `adjust`, or `expire`. `points` is signed, and `redemptionId` and `orderId` are
  optional.
- `loyalty_redemptions` (`loyalty.ts:52`) is the redemption state machine: `pending` moves
  to `validated`, `rejected`, or `expired`. It also records `validatedBy` and
  `validatedAt`.

Customers and balances are defined in `packages/db/src/schema/customers.ts`:

- `customers` (`customers.ts:3`) identifies a customer by email, which is unique. There is
  no password.
- `customer_restaurants` (`customers.ts:12`) holds per-restaurant balances,
  `pointsBalance` and `stampsBalance`, the first and last visit timestamps, and the
  version/date of the loyalty privacy consent. The current server version is `loyalty-v1`;
  the migration does not backfill existing relations. Its primary key is
  `(customerId, restaurantId)`.
- `customer_visits` (`customers.ts:30`) is the visit log. Its `source` is `qr`, `direct`,
  `domain`, or `order`, and it is used for insights.

## Backend

There are two routers: a public one for the customer and an admin one for the operator.

### Public router

The public router is `loyalty.*` in `apps/api/src/modules/loyalty/`. Every procedure is a
`publicProcedure` (`loyalty.router.ts:18`). The customer is identified by an opaque card
token held in `localStorage`, and every call carries the tenant `host`.

The public menu contract also exposes `publicFeatures.loyalty`. The API derives it from the
real program state (`isActive`) and the count of active, non-deleted rewards. The public
layout hides the loyalty tab when this capability is false, while direct `/puntos` links
remain available and render the existing unavailable state with `noindex,nofollow`.

`createCard` requires `consentAccepted: true`. The server records the current consent version
and timestamp in `customer_restaurants`; repeating the same registration keeps the balance and
the original timestamp, while a newer policy version updates the consent. Card reads and
operations reject tokens whose relation has no current consent, so older cards return to the
signup flow before they can be used.

| Procedure                              | Description                                                                             |
| -------------------------------------- | --------------------------------------------------------------------------------------- |
| `program`                              | Returns the active program and its rewards for the tenant.                              |
| `createCard`                           | Creates or links a card for an email after explicit privacy consent (`create-card.ts`). |
| `getCard`                              | Returns the card, its balance, and its history (`get-card.ts`).                         |
| `earnStamp`                            | Earns a stamp or points, gated by the venue code (`earn-stamp.ts`).                     |
| `requestRedemption`                    | Opens a `pending` redemption (`request-redemption.ts`).                                 |
| `cancelRedemption`, `redemptionStatus` | Cancel or poll a redemption.                                                            |

### Admin router

The admin router is `admin.loyalty.*` in `apps/api/src/modules/admin-loyalty/`, built on
`tenantProcedure`. It covers program configuration (`getProgram` and `saveProgram`),
reward CRUD (`createReward`, `updateReward`, and `deleteReward`), daily operations
(`venueCode`, `pendingRedemptions`, `validateRedemption`, `rejectRedemption`, and `undo`),
and insights (`summary`, `customers`, `visitsChart`, and `loyaltyReturn`).

### The venue code

The venue code proves that the customer is physically in the restaurant without using a
scanner. It is a rotating four-digit code in the style of TOTP, and it is stateless:
nothing is stored. The implementation is `apps/api/src/lib/loyalty/venue-code.ts`.

- `getVenueCode` (`venue-code.ts:36`) computes an HMAC of
  `restaurantId:branchId:windowIndex` with a signing secret and takes four digits from it.
  The window is three minutes (`VENUE_CODE_WINDOW_MS`, `venue-code.ts:3`). Staff read the
  current code from the admin application.
- `verifyVenueCode` (`venue-code.ts:83`) runs when a customer types a code to earn. It
  accepts the current window and the previous one, which absorbs clock skew and slow
  typing, and returns the matching branch ID. Because the code is derived from the secret,
  verification needs no storage.

Ledger writes go through `packages/db/src/repositories/loyalty-ledger.repository.ts`.
Admin and insight reads go through `loyalty-admin.repository.ts` and
`loyalty-insights.repository.ts`. `customers.repository.ts` owns the customer and balance
rows.

## Frontend

The public interface is in `apps/web`. The route is
`apps/web/src/app/routes/{-$locale}.puntos.tsx`, and the feature directory is
`apps/web/src/features/loyalty/`, which contains `loyalty-page`, `loyalty-experience`,
`use-loyalty-controller`, and `loyalty-query-options`. It is wired to the live tRPC API.
The card components live in `packages/ui`: `qm-loyalty-card`, `qm-loyalty-signup`,
`qm-redeem-wait`, `qm-stamp-grid`, and `qm-reward-row`.

The admin interface is in `apps/admin`. The routes are `_auth.loyalty.tsx` for the layout,
`_auth.loyalty.index.tsx` for operations, `_auth.loyalty.program.tsx`, and
`_auth.loyalty.insights.tsx`. The feature directory is `apps/admin/src/features/loyalty/`.

## Example: earning a stamp in the restaurant

1. The diner opens the menu, taps the loyalty card at `/puntos`, accepts the privacy policy,
   and signs up with an email address. `loyalty.createCard` records the consent version and
   stores a card token in `localStorage`.
2. The diner asks for a stamp, and staff read the current four-digit code from the admin
   operations screen (`admin.loyalty.venueCode`, backed by `getVenueCode`).
3. The diner types the code, and the client calls
   `loyalty.earnStamp({ host, cardToken, venueCode })`.
4. `earn-stamp.ts` calls `verifyVenueCode(...)` (`venue-code.ts:83`). A code from the
   current or previous three-minute window is valid and returns the branch ID.
5. An `earn` row is written to `loyalty_transactions`, and the balance in
   `customer_restaurants` is incremented. There is no approval queue.

## Example: redeeming a reward

1. The diner picks a reward, and `loyalty.requestRedemption` creates a `pending` row in
   `loyalty_redemptions`.
2. The row appears on the staff operations screen through
   `admin.loyalty.pendingRedemptions`.
3. During the same conversation, staff tap the row. `admin.loyalty.validateRedemption`
   moves it to `validated`, records `validatedBy` and `validatedAt`, and writes a `redeem`
   ledger row. `rejectRedemption` declines it instead, and `undo` reverses a recent
   action.

## Key files

| Concern                                        | Path                                                                                                |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Program, reward, ledger, and redemption schema | `packages/db/src/schema/loyalty.ts`                                                                 |
| Customer and balance schema                    | `packages/db/src/schema/customers.ts`                                                               |
| Public loyalty router                          | `apps/api/src/modules/loyalty/loyalty.router.ts`                                                    |
| Public handlers                                | `apps/api/src/modules/loyalty/*.ts`                                                                 |
| Admin loyalty router and handlers              | `apps/api/src/modules/admin-loyalty/`                                                               |
| Venue code                                     | `apps/api/src/lib/loyalty/venue-code.ts`, `token.ts`                                                |
| Ledger, admin, and insight repositories        | `packages/db/src/repositories/loyalty-*.repository.ts`, `customers.repository.ts`                   |
| Public UI                                      | `apps/web/src/features/loyalty/`, `apps/web/src/app/routes/{-$locale}.puntos.tsx`                   |
| Admin UI                                       | `apps/admin/src/features/loyalty/`, `apps/admin/src/app/routes/_auth.loyalty.*.tsx`                 |
| Loyalty card components                        | `packages/ui/src/components/organisms/qm-loyalty-*`, `.../molecules/qm-stamp-grid`, `qm-reward-row` |
| Design reasoning                               | `docs/design/loyalty-ux.md`                                                                         |

## Limitations

- Email is the only identity. There is no password and no verification.
  `customers.email` is the key across restaurants, and balances are per customer and
  restaurant.
- Presence is proven by the venue code, not by a scanner. The code is stateless and
  derived from the signing secret, so there is nothing to store, but the secret must be
  configured and must stay out of the client bundle.
- Earning is granted automatically and redemption is validated by staff. There is no
  approval queue for earning, because the code is the gate.
- A nearly empty `apps/web/src/features/fidelity/` directory also exists. The live feature
  is `features/loyalty/`.
