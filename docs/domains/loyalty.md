# Loyalty

The rewards program: how diners earn points or stamps, how they redeem rewards, and
how staff validate a redemption in-store. This is the most built-out feature in
qmenut.

## Purpose & status

✅ Complete and wired end to end (schema + public API + admin API + both UIs). A
restaurant runs **one** loyalty program (points *or* stamps), defines **rewards**, and
customers redeem them; staff validate redemptions in person using a rotating **venue
code** — no scanner, no camera. The UX rationale is in
[../design/loyalty-ux.md](../design/loyalty-ux.md) (decisions locked 2026-07-08,
revised 2026-07-10 to drop QR scanning).

## Data model

Program and rewards (`packages/db/src/schema/loyalty.ts`):

- **`loyalty_programs`** (`loyalty.ts:3`) — one row per restaurant (`restaurantId` is
  the PK). `type` is `points | stamps`; `pointsPerCurrencyUnit`, `pointsPerVisit`,
  `stampsPerVisit`, optional `rulesJson`.
- **`loyalty_rewards`** (`loyalty.ts:15`) — `cost` (points/stamps) and `type`:
  `percentage_discount` (`percentage`), `free_dish` (`freeDishId`), or `special_price`
  (`specialPrice`).
- **`loyalty_transactions`** (`loyalty.ts:35`) — the ledger. `type` is
  `earn | redeem | adjust | expire`; signed `points`; optional `redemptionId`/`orderId`.
- **`loyalty_redemptions`** (`loyalty.ts:52`) — the redemption state machine:
  `pending → validated | rejected | expired`, plus `validatedBy`/`validatedAt`.

Customer & balances (`packages/db/src/schema/customers.ts`):

- **`customers`** (`customers.ts:3`) — identity is **email** (`unique`). No password.
- **`customer_restaurants`** (`customers.ts:12`) — per-restaurant balances
  (`pointsBalance`, `stampsBalance`) and first/last visit. PK `(customerId,
  restaurantId)`.
- **`customer_visits`** (`customers.ts:30`) — visit log with a `source`
  (`qr | direct | domain | order`), used for insights.

## Backend

Two routers — public (the customer) and admin (the operator).

### Public: `loyalty.*` (`apps/api/src/modules/loyalty/`)

All `publicProcedure` (`loyalty.router.ts:18`). The customer is identified by a
**card token** (opaque, in `localStorage`), and every call carries the tenant `host`:

- `program` — the active program + rewards for this tenant.
- `createCard` — creates/links a card for an email (`create-card.ts`).
- `getCard` — the card + balance + history (`get-card.ts`).
- `earnStamp` — earns a stamp/points, **gated by the venue code** (`earn-stamp.ts`).
- `requestRedemption` — opens a `pending` redemption (`request-redemption.ts`).
- `cancelRedemption` / `redemptionStatus` — manage/poll a redemption.

### Admin: `admin.loyalty.*` (`apps/api/src/modules/admin-loyalty/`)

`tenantProcedure`. Program config (`getProgram`, `saveProgram`), rewards CRUD
(`createReward`/`updateReward`/`deleteReward`), operations (`venueCode`,
`pendingRedemptions`, `validateRedemption`, `rejectRedemption`, `undo`), and insights
(`summary`, `customers`, `visitsChart`, `loyaltyReturn`).

### The venue code (`apps/api/src/lib/loyalty/venue-code.ts`)

This is how "the customer is physically here right now" is proven without a scanner.
It's a **TOTP-style rotating 4-digit code**, stateless (nothing stored):

- `getVenueCode` (`venue-code.ts:36`) — HMACs `restaurantId:branchId:windowIndex` with
  a signing secret and takes 4 digits. The window is 3 minutes
  (`VENUE_CODE_WINDOW_MS`, `venue-code.ts:3`). Staff read the current code off the
  admin app.
- `verifyVenueCode` (`venue-code.ts:83`) — when a customer types a code to earn,
  accepts the **current or previous** window (clock skew / slow readers) and returns
  the matching branch id. Because it's derived from the secret, it needs no storage.

Ledger writes go through `packages/db/src/repositories/loyalty-ledger.repository.ts`;
admin/insight reads through `loyalty-admin.repository.ts` and
`loyalty-insights.repository.ts`; `customers.repository.ts` owns the customer/balance
rows.

## Frontend

- **Public** (`apps/web`): route `apps/web/src/app/routes/{-$locale}.puntos.tsx` →
  `apps/web/src/features/loyalty/` (`loyalty-page`, `loyalty-experience`,
  `use-loyalty-controller`, `loyalty-query-options`) — wired to the real tRPC API. Card
  UI components live in `packages/ui` (`qm-loyalty-card`, `qm-loyalty-signup`,
  `qm-redeem-wait`, `qm-stamp-grid`, `qm-reward-row`).
- **Admin** (`apps/admin`): routes `_auth.loyalty.tsx` (layout),
  `_auth.loyalty.index.tsx` (operations), `_auth.loyalty.program.tsx`,
  `_auth.loyalty.insights.tsx`; feature `apps/admin/src/features/loyalty/`.

## Walkthrough: earn a stamp in the restaurant

1. Diner opens the menu, taps into the loyalty card (`/puntos`), signs up with email
   → `loyalty.createCard` stores a card token in `localStorage`.
2. Diner asks to collect a stamp; staff read the current 4-digit code off the admin
   operations screen (`admin.loyalty.venueCode` → `getVenueCode`).
3. Diner types the code; the client calls `loyalty.earnStamp({ host, cardToken,
   venueCode })`.
4. `earn-stamp.ts` calls `verifyVenueCode(...)` (`venue-code.ts:83`) — valid for the
   current/previous 3-min window → returns the branch id.
5. A `earn` row is written to `loyalty_transactions` and `customer_restaurants`
   balance is bumped. No approval queue.

## Walkthrough: redeem a reward

1. Diner picks a reward → `loyalty.requestRedemption` creates a `pending`
   `loyalty_redemptions` row.
2. It appears on the staff operations screen via `admin.loyalty.pendingRedemptions`.
3. During the same conversation, staff tap the row →
   `admin.loyalty.validateRedemption` moves it to `validated`, records
   `validatedBy`/`validatedAt`, and writes a `redeem` ledger row (or `rejectRedemption`
   to decline). `undo` reverses a recent action.

## Key files

| Concern | Path |
|---|---|
| Program/reward/ledger/redemption schema | `packages/db/src/schema/loyalty.ts` |
| Customer & balances schema | `packages/db/src/schema/customers.ts` |
| Public loyalty router | `apps/api/src/modules/loyalty/loyalty.router.ts` |
| Public handlers | `apps/api/src/modules/loyalty/*.ts` |
| Admin loyalty router + handlers | `apps/api/src/modules/admin-loyalty/` |
| Venue code (rotating) | `apps/api/src/lib/loyalty/venue-code.ts`, `token.ts` |
| Ledger / admin / insights repos | `packages/db/src/repositories/loyalty-*.repository.ts`, `customers.repository.ts` |
| Public UI | `apps/web/src/features/loyalty/`, `apps/web/src/app/routes/{-$locale}.puntos.tsx` |
| Admin UI | `apps/admin/src/features/loyalty/`, `apps/admin/src/app/routes/_auth.loyalty.*.tsx` |
| Loyalty card components | `packages/ui/src/components/organisms/qm-loyalty-*`, `.../molecules/qm-stamp-grid`, `qm-reward-row` |
| UX rationale | `docs/design/loyalty-ux.md` |

## Notes & gotchas

- **Email is the only identity** — no password, unverified. `customers.email` is the
  key across restaurants; balances are per `(customer, restaurant)`.
- **Presence proof = the venue code, not a scanner.** It's stateless and derived from
  the signing secret; nothing to store, but the secret must be configured and kept out
  of the client.
- **Earning is auto-granted; redemption is staff-validated.** There's no approval queue
  for earning — the code *is* the gate.
- A near-empty `apps/web/src/features/fidelity/` directory also exists; the live
  feature is `features/loyalty/`.
