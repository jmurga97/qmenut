# Loyalty stamp requests: implementation plan

Status: planned, not started. Branch `feat/loyalty-stamp-requests`, cut from `feat/notifications`.

This plan implements [loyalty-stamp-requests-ux.md](../design/loyalty-stamp-requests-ux.md) and
[ADR 0007](../adr/0007-unanswered-stamp-requests-are-accepted.md). Everything else in
[loyalty-ux.md](../design/loyalty-ux.md) still holds. Terms follow the _Loyalty_ section of
[CONTEXT.md](../../CONTEXT.md).

## Ship order

1. Notifications ([notifications.md](notifications.md), `feat/notifications`).
2. **Loyalty stamp requests** (this plan).
3. Reservations ([reservations.md](reservations.md), `feat/reservations`).

This branch needs branch 1: each stamp request is a notification event, and staff learn about
requests through the inbox and the per-branch push.

## What exists today

- Earning is `loyalty.earnStamp({ cardToken, venueCode })`
  (`apps/api/src/modules/loyalty/earn-stamp.ts`): `resolveCard` → program active → the code throttle
  `LOYALTY_CODE_LIMITER` (5 calls per 60 s per customer, also counting successes) →
  `verifyVenueCode` → `addStamp`.
- `addStamp` (`packages/db/src/repositories/loyalty-ledger.repository.ts:197-249`) enforces the 4 h
  cooldown inside one race-safe `INSERT … SELECT … WHERE NOT EXISTS (earn in the last 4 h)`, then
  writes the balance, the visit dates and a `customer_visits` row in a separate batch.
- Known gotcha: an undone earn still counts toward the cooldown, because undo only adds an `adjust`
  row and the `earn` row stays.
- `rules_json` has no schema; it is parsed by hand in
  `packages/db/src/repositories/loyalty-admin.repository.ts:14-31` and holds only `ticketMedio`.
- `stamps_per_visit` is hardcoded to 1 and only exposed by `get-loyalty-program.ts:73-79`.
- The venue code is stateless (`apps/api/src/lib/loyalty/venue-code.ts`); `verifyVenueCode`
  (l.58-78) tries every branch and returns the matching `branchId`.
- Redemption validation flips `pending → validated` and reverts on a balance `CHECK` failure
  (ledger l.257-340); `compensateTransaction` (l.401-456) is the idempotent undo
  (`reasonCode = "undo:<id>"`).
- The admin redemption queue polls every 5 s while visible and shows an undo toast
  (`apps/admin/src/features/loyalty/hooks/use-redemption-queue.ts:21-69`, `UNDO_NOTICE_MS` 8000).
- The public card lives in `apps/web/src/features/loyalty/components/loyalty-experience.tsx`; the
  code entry is an inline panel (`StampCode`, l.263-280) inside the `qm-loyalty-card` web component.

## Decisions taken while planning

These are not in the design; they were settled while writing this plan.

- `loyalty.earnStamp` is **replaced** by `loyalty.requestStamps` (`earn-stamp.ts` becomes
  `request-stamps.ts`). The web and the API deploy together; a tab left open on the old version gets
  one error.
- Undoing an **acceptance** writes a compensating `adjust` and sets the request to `declined`.
  Returning it to `pending` would let the cron accept it again at once when it is older than 12 h.
- Undoing a **decline** (from the toast only) returns the request to `pending`.
- Undoing an acceptance also deletes the visit it logged (`visit_id` on the request), so "visits come
  only from accepted requests" stays true.
- The one-time outcome notice on the card is cleared by an explicit `dismissStampOutcome` mutation,
  not by the card query: a focus refetch would otherwise clear it before the guest sees it.
- The 4 h cooldown moves to requests ("whatever its outcome", cancelled excluded), which also fixes
  today's gotcha of undone earns counting.
- The per-branch replaceable push ("N stamp requests waiting", the `branchCount` push mode) is built
  in this branch, where its only user is.

## Phase 1: schema and migration

`loyalty_stamp_requests` in `packages/db/src/schema/loyalty.ts`:

| Column              | Notes                                                            |
| ------------------- | ---------------------------------------------------------------- |
| `id`                | text primary key                                                 |
| `customer_id`       | fk `customers`, cascade                                          |
| `restaurant_id`     | fk `restaurants`, cascade                                        |
| `branch_id`         | fk `branches`, set null (always set at creation)                 |
| `claimed_quantity`  | integer, `CHECK` 1–10                                            |
| `accepted_quantity` | integer, nullable                                                |
| `status`            | `CHECK IN ('pending', 'accepted', 'declined', 'cancelled')`      |
| `auto_accepted`     | integer boolean                                                  |
| `handled_by`        | fk `restaurant_users`, set null                                  |
| `handled_at`        | integer, nullable                                                |
| `transaction_id`    | the earn transaction written at acceptance, for undo             |
| `visit_id`          | the `customer_visits` row written at acceptance, for undo        |
| `outcome_seen_at`   | integer, nullable: when the guest dismissed the outcome notice   |
| `created_at`        | integer: the request time, also the date of the stamps and visit |
| `updated_at`        | integer                                                          |

Indexes: `(restaurant_id, branch_id, status, created_at)` for the staff list,
`(customer_id, restaurant_id, created_at)` for the cooldown and the card,
`(status, created_at)` for the auto-accept sweep.

`rules_json`: extend `LoyaltyProgramRules` in `loyalty-admin.repository.ts:14-31` with
`stampRequestLimit`, default 3, clamped to 1–10 on read. `stamps_per_visit` stays at 1 and is no
longer read.

Generate with `bun run db:generate -- --name loyalty_stamp_requests`.

## Phase 2: ledger

In `packages/db/src/repositories/loyalty-ledger.repository.ts`:

- Split `addStamp` into `writeEarn({ customerId, restaurantId, branchId, points, at })`: the earn
  transaction dated `at`, the balance, first and last visit dates, and the `customer_visits` row.
  Drop its cooldown `INSERT … WHERE NOT EXISTS`; the cooldown moves to requests.
- `createStampRequest`: one `INSERT … SELECT … WHERE NOT EXISTS (a request by this card in the last
4 h whose status is not cancelled)`. Race-safe, like the old cooldown.
- `acceptStampRequest({ id, quantity, handledBy })` (`handledBy` null for automatic):
  - flip `pending → accepted` guarded by `WHERE status = 'pending'`, returning a conflict when no row
    changes;
  - `writeEarn` with `at = request.created_at`, so the stamps and the visit are dated at the request
    time;
  - store `transaction_id` and `visit_id`;
  - revert to `pending` if the write fails (pattern: `validateRedemption`, l.257-340).
- `declineStampRequest`, and `cancelStampRequest` for the guest, both `pending` only.
- `acceptOverdueStampRequests({ restaurantId?, now })`: pending requests older than 12 h are
  accepted at the claimed quantity with `auto_accepted`, in batches of 50. No `is_active` check:
  requests made while the program was on are still accepted after the owner turns it off.
- Every transition calls `markNotificationHandled` from branch 1 with outcome `accepted`,
  `autoAccepted`, `declined` or `cancelled`.

## Phase 3: guest API

In `apps/api/src/modules/loyalty/`:

- `request-stamps.ts`, procedure `loyalty.requestStamps({ cardToken, venueCode, quantity })`:
  1. `resolveCard`, program active;
  2. `LOYALTY_CODE_LIMITER`, unchanged (5 tries per minute per card);
  3. `quantity ≤ stampRequestLimit`, otherwise `BAD_REQUEST`;
  4. `verifyVenueCode`, which gives the branch;
  5. `createStampRequest`, `CONFLICT` "Ya pediste sellos en esta visita" inside the 4 h;
  6. emit `loyalty.stampRequest` for that branch with facts `{ quantity }`.

  The input schema lives in `loyalty-input.schema.ts` (quantity an integer from 1 to 10).

- `cancel-stamp-request.ts`, `loyalty.cancelStampRequest({ cardToken, requestId })`: pending only,
  `NOT_FOUND` otherwise; a cancelled request does not count toward the 4 h.
- `dismiss-stamp-outcome.ts`, `loyalty.dismissStampOutcome({ cardToken, requestId })`: sets
  `outcome_seen_at`.
- `get-card.ts`: runs `acceptOverdueStampRequests` for the restaurant first (lazy, like redemption
  expiry), then also returns:
  - `pendingRequests`: `[{ id, quantity, createdAt }]`, for the Cancelar action;
  - `pendingStamps`: their sum;
  - `lastOutcome`: `{ id, status, claimed, accepted }` of the latest handled request not yet
    dismissed, or null.
- `get-loyalty-program.ts:73-79`: expose `stampRequestLimit` instead of `stampsPerVisit`.
- Rewards unlock only on the accepted balance; nothing changes there, since the balance moves only
  at acceptance.

## Phase 4: admin API

In `apps/api/src/modules/admin-loyalty/`, all `featureProcedure("loyalty")` with
`requirePermission(…, "loyalty.operate")` (owner, admin and staff):

- `pendingStampRequests({ branchId })`: `assertBranchAccess`, lazy auto-accept, then email, claimed
  quantity, `createdAt` and `autoAcceptAt` (`createdAt + 12 h`). The device's active branch scopes
  it, the same as the venue code.
- `acceptStampRequest({ requestId, quantity })` with `1 ≤ quantity ≤ claimed`, and
  `declineStampRequest({ requestId })`. A second device answering the same request gets `CONFLICT`
  "La solicitud ya se ha respondido".
- `handledStampRequests({ branchId })`: the last 24 h, with outcome, handler name and whether undo is
  possible.
- `undoStampRequest({ requestId })`:
  - accepted: `compensateTransaction` (idempotent through `undo:<id>`), refused with "Los sellos ya se
    han canjeado" when the balance would go negative; delete the visit; status `declined`;
  - declined: back to `pending`.
- `getProgram` and `saveProgram`: `stampRequestLimit`, 1–10.

## Phase 5: notifications wiring

- `apps/api/src/modules/notifications/events.ts`: `loyalty.stampRequest`, actionable, push mode
  `branchCount`, URL `/loyalty`.
- The push consumer, for `branchCount`: count the branch's unhandled stamp-request notifications at
  send time and skip the push at 0. `tag` and the `Topic` header are `stamp-requests-<branchId>`, so
  both the push service and the device replace the previous push instead of stacking them. Text:
  "3 solicitudes de sellos · Tapas Centro".
- The inbox keeps one row per request.
- The minute cron runs `acceptOverdueStampRequests()` next to `runNotificationMaintenance`, which
  also marks those notifications handled.

## Phase 6: admin UI

In `apps/admin/src/features/loyalty/`:

- `components/stamp-requests-panel.tsx`, placed between `venue-code-card` and
  `pending-redemptions-panel` in `pages/loyalty-operations-page.tsx`, titled "Solicitudes de sellos":
  - each row shows the guest email, the claimed quantity with a stepper that can only go down
    (minimum 1), the request time ("hace 2 h · 18:42", to match against the till) and
    "Se acepta sola en 10 h";
  - actions Aceptar and Rechazar;
  - below, a collapsed "Últimas 24 h" list: "Aceptada", "Aceptada sola", "Aceptada 2 de 3",
    "Rechazada", with Deshacer on accepted ones;
  - no "accept all": doing nothing already accepts.
- `hooks/use-stamp-request-queue.ts`: 5 s polling while visible and the undo toast, copied from
  `use-redemption-queue.ts:21-69`. Mutations invalidate `trpc.admin.loyalty.pathKey()` as today, so a
  conflict refreshes the list.
- Program setup (`pages/loyalty-program-page.tsx`, `types.ts:74-78`, `mappers.ts`): one field,
  "Máximo de sellos por solicitud", default 3, range 1–10.
- Inbox text for `loyalty.stampRequest`: "Solicitud de 3 sellos" (es and en keys).

## Phase 7: public web

In `apps/web/src/features/loyalty/` and `packages/ui`:

- `components/loyalty-experience.tsx`: the button becomes "Pedir sellos". The stamp panel asks
  "¿Cuántos?" with a stepper from 1 to the limit, starting at 1, then the venue code (`QmCodeInput`).
- `packages/ui/src/components/organisms/qm-loyalty-card`: pending stamps render as outlined slots
  labelled "3 pendientes", with a Cancelar action emitted as a `qm-*` event. The stamp-grid molecule
  gets the pending slot style.
- `hooks/use-stamp-flow.ts`: calls `requestStamps` with the quantity. `CONFLICT` shows
  "Ya pediste sellos en esta visita"; the 30 s lock on `TOO_MANY_REQUESTS` is unchanged.
- One-time notice from `lastOutcome`: the stamps fill in, "Confirmaron 2 de 3 sellos", or
  "Tu solicitud no fue aceptada"; then `dismissStampOutcome`.
- Card query: refresh when opened and when the page regains focus (`refetchOnWindowFocus: "always"`).
  No polling and no email, since answers can take hours.
- Copy in all 14 locale files under `apps/web/src/lib/i18n/resources/`, replacing "1 sello por
  visita" and "Ya tienes el sello de esta visita".

## Phase 8: insights, tests and docs

- Insights need no query change. Earn transactions are dated at the request time, so a request on
  the 31st accepted on the 1st counts in the earlier month; pending stamps have no earn row; visits
  are written only at acceptance (`loyalty-insights.repository.ts:25-75` and `210-233`). Verify the
  month-boundary case by hand.
- Update the existing E2E tests for the new flow (required: `deploy` runs them):
  - `e2e/helpers/loyalty.ts`: `earnStamp` becomes request plus staff accept;
  - `e2e/tests/cross/loyalty-journey.spec.ts`;
  - `e2e/tests/cross/loyalty-recovery.spec.ts` (the cooldown case at l.53);
  - `e2e/tests/admin/loyalty-admin.spec.ts`.

  No new specs unless asked (AGENTS.md).

- `docs/domains/loyalty.md`: document stamp requests, the cooldown and the throttle, and fix its
  stale parts (it says `tenantProcedure` where the code uses `featureProcedure`, lists a
  `loyaltyReturn` procedure that doesn't exist, and names an absent `features/fidelity/` directory).

## Verification

- `bun run check`, `bun run lint`, `bun run build`, `bun run test`, `bun run test:e2e`.
- Manual:
  1. On `tapas.localhost/puntos`, request 3 stamps with the venue code: the card shows
     "3 pendientes" and Cancelar.
  2. In the admin, the request appears under "Solicitudes de sellos" and in the inbox; lower it to 2
     and accept.
  3. Reopen the card: "Confirmaron 2 de 3 sellos", once.
  4. Undo it from "Últimas 24 h": the balance drops back and the request shows as declined.
  5. Seed a 13 h-old pending request and run the cron: it is accepted automatically, with
     "Aceptada sola" in the admin and "Accepted automatically" in the inbox.
  6. With push on, several requests produce one per-branch push whose count updates.

## Not in this branch

The design's "Not in version 1" list: staff granting stamps without a request, a configurable 12 h
window or cooldown, notifying the guest by email or push, and fraud flags.
