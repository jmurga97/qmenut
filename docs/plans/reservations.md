# Reservations v1: implementation plan

Status: in progress — Phases 0 (messaging skeleton), 1 (feature, permission, schema), 2 (booking core), 3 (public API and `/reservar`), 4 (admin) and 5 (lifecycle jobs; their emails and notifications come with phase 6) done. Branch `feat/reservations`, cut from `feat/loyalty-stamp-requests`.

This plan implements [reservations-ux.md](../design/reservations-ux.md) and ADRs
[0003](../adr/0003-whatsapp-through-ming-msg-worker.md),
[0004](../adr/0004-reservation-access-by-email-alone.md) and
[0005](../adr/0005-unanswered-reservations-are-accepted.md). Terms follow the _Reservations_
section of [CONTEXT.md](../../CONTEXT.md). In this page "branch" means a restaurant branch, never a
git branch, unless it names one.

## Ship order

1. Notifications ([notifications.md](notifications.md), `feat/notifications`).
2. Loyalty stamp requests ([loyalty-stamp-requests.md](loyalty-stamp-requests.md),
   `feat/loyalty-stamp-requests`).
3. **Reservations** (this plan).

This branch needs branch 1 for the reservation notifications (new request, cancellation,
unconfirmed) and reuses its `queue` handler and minute-cron maintenance list.

## Prerequisites outside this repository

- `ming-msg-worker` deployed: its D1 id, `QMENUT_PHONE_NUMBER_ID`, its three secrets, and the four
  queues with their DLQs.
- Meta approval of the `reservation_attendance` WhatsApp template in `es` and `en`, with
  _Confirm_ and _Cancel_ quick-reply buttons.
- New templates in `ming-email-worker`: request received (guest), new request (owners), accepted,
  declined (with the branch phone) and cancelled. They take a `locale` in `data`, because no email
  sends a language today.

## What exists today

- No reservation code on any git branch: no schema, no tRPC, no admin page, no `/reservar` route.
- `feature/ws-agent-reservations` holds one commit, `ba3b86f` "first skeleton qmenut ws messaging": a
  superadmin WhatsApp test console and the `ming-msg-worker` transport. Its only reservation traces
  are the `reservation_attendance` template id and the console's test form. That git branch is 16
  commits behind `main`.
- Plan features: `PlanFeature` and `PLAN_FEATURES` in `packages/permissions/src/index.ts:74-106`.
  Branch-scoped features follow each branch's plan; `RESTAURANT_FEATURES` (l.109) are on when any
  branch has them. `requireFeature(ctx, { feature, branchId })` lives in
  `apps/api/src/lib/billing/entitlement.ts:47`.
- Email goes through the `EMAIL_WORKER` binding to `ming-email-worker`
  (`POST https://email-worker.internal/send?productId=qmenut`); templates in use are `otp`,
  `user-invite` and `analytics-digest`. Nothing excludes support accounts from emails today.
- `restaurants.timezone` (default `Europe/Madrid`) and `restaurants.country_code` (ISO alpha-3)
  exist. `branches.phone` is free text. The only timezone helper is the private
  `getLocalDayAndMinute` in `packages/db/src/domain/promotions.ts:36`.
- No retention or anonymization job exists anywhere; the 90-day anonymization is the first.
- The public web has no calendar or date component and no remembered-email pattern; the closest is
  the loyalty card token in `localStorage` (`apps/web/src/features/loyalty/hooks/use-loyalty-card-token.ts`).

## Decisions taken while planning

These are not in the design; they were settled while writing this plan.

- **Slot capacity is one number per branch.** A branch's tables don't change from one slot to the
  next.
- The public `create` gets a Cloudflare rate-limit binding, `RESERVATION_LIMITER`, keyed by IP,
  because it sends emails to any address typed in. Same pattern as `LOYALTY_CODE_LIMITER`.
- The messaging skeleton from `ba3b86f` is **ported, not merged**. Its migration
  `0012_messaging_events.sql` clashes with main's `0012_grandfather_business_plan.sql` (and the
  journal entry 12), and its `admin-shell.tsx` diff predates the `feature`/`isLocked` sections. The
  migration is regenerated with Drizzle Kit.
- Owner emails exclude support accounts (`isInternalSupportEmail`), as the design requires.
- When `MSG_WORKER` is absent (local `wrangler dev`, where the binding is deliberately missing) the
  attendance check is logged and skipped instead of failing.

## Phase 0: port the messaging skeleton

From `ba3b86f`, re-applied on top of this branch:

- `packages/db/src/schema/messaging.ts` (`messaging_events`, deduplicated on
  `(message_id, type, status)`), exported from the schema barrel, and
  `packages/db/src/repositories/messaging-events.repository.ts`. Regenerate the migration with
  `bun run db:generate -- --name messaging_events` instead of copying `0012_*`.
- `apps/api/src/modules/messaging/handle-messaging-events.ts`: the Zod v1 event contract
  (`status`, `button`, `text`, `unsupported`, `opted_out`); invalid events are acked with a Sentry
  message, D1 errors retried after 30 s.
- `apps/api/src/modules/messaging/msg-worker.client.ts`: `sendTemplate` and `replyText`.
- `apps/api/src/config/env/schema.ts`: `MSG_WORKER` (optional), `MSG_PRODUCT_ID`.
- `apps/api/wrangler.jsonc`: the `MSG_WORKER` service binding (`MessagingRpc`, `remote: true`) and
  the `ming-msg-events-qmenut-dev` / `ming-msg-events-qmenut` consumers (batch 10, 3 retries, DLQ),
  in the `development` and `production` blocks only.
- The `queue` handler from branch 1 dispatches names starting with `ming-msg-events-` to
  `handleMessagingEvents`.
- The superadmin console: `admin-messaging.router.ts` (`internalSupportProcedure`), route
  `apps/admin/src/app/routes/_auth.messaging.tsx`, `features/messaging/`, rewritten against the
  current `SECTIONS` shape in `admin-shell.tsx`.

## Phase 1: plan feature, permission and schema

`packages/permissions/src/index.ts`:

- `reservations` in `PlanFeature` and in `PLAN_FEATURES.business`. It is branch-scoped: **not** in
  `RESTAURANT_FEATURES`.
- Permission `reservations.manage` for owner, admin and staff.
- Add the row to `docs/sales/plan-features.md`.

New `packages/db/src/schema/reservations.ts`, exported from the barrel:

`reservation_settings`, primary key `branch_id`:

| Column                   | Default | Meaning                                       |
| ------------------------ | ------- | --------------------------------------------- |
| `restaurant_id`          |         | fk, cascade                                   |
| `is_enabled`             | 0       | off until the restaurant turns it on          |
| `slot_capacity`          |         | tables per slot, set by the restaurant        |
| `online_party_limit`     | 8       | above it the guest is asked to call           |
| `window_days`            | 30      | how far ahead guests can book                 |
| `lead_time_minutes`      | 120     | minimum notice before a slot                  |
| `response_time_minutes`  | 720     | staff answer time before automatic acceptance |
| `check_before_minutes`   | 120     | when the attendance check is sent             |
| `check_deadline_minutes` | 45      | answer deadline before the slot               |
| `updated_at`             |         |                                               |

`reservation_slots`: `branch_id`, `weekday` (0–6), `start_minute` (minutes after local midnight);
unique together.

`reservation_closures`: `branch_id`, `date` (local `YYYY-MM-DD`), `start_minute` (null closes the
whole day), `created_by`, `created_at`; unique `(branch_id, date, start_minute)`.

`reservations`:

| Column                                     | Notes                                                                                   |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| `id`, `restaurant_id`, `branch_id`         |                                                                                         |
| `slot_date`, `slot_minute`                 | local date and start minute                                                             |
| `starts_at`                                | UTC milliseconds computed from the restaurant timezone                                  |
| `party_size`                               |                                                                                         |
| `guest_name`, `guest_phone`, `guest_email` | phone in E.164, email lowercased; nulled by anonymization                               |
| `guest_language`                           | the site language, for emails and the WhatsApp template                                 |
| `status`                                   | `CHECK IN ('pending', 'accepted', 'confirmed', 'unconfirmed', 'declined', 'cancelled')` |
| `auto_accepted`                            | integer boolean                                                                         |
| `cancelled_by`                             | `guest` or `staff`                                                                      |
| `handled_by`, `handled_at`                 | fk `restaurant_users`, set null                                                         |
| `respond_by`                               | `min(created_at + response time, starts_at − lead time)` (ADR 0005)                     |
| `check_sent_at`                            | when the attendance check went out                                                      |
| `consent_at`                               | the review-step checkbox                                                                |
| `anonymized_at`                            |                                                                                         |
| `created_at`, `updated_at`                 |                                                                                         |

Indexes: `(branch_id, slot_date, slot_minute, status)` for capacity, `(branch_id, guest_email)` for
the guest lookup, `(status, respond_by)` and `(status, starts_at)` for the cron sweeps.

Generate with `bun run db:generate -- --name reservations`.

## Phase 2: booking core

- Time: move `getLocalDayAndMinute` out of `packages/db/src/domain/promotions.ts:36` into a shared
  `packages/db/src/domain/local-time.ts` (reservations is its second consumer) and add the inverse,
  local date and minute to UTC, with `Intl` only.
- `availability({ branch, from, to, now })`:
  - each day is _available_ (some slot has a free table), _full_ (every slot full) or _unavailable_
    (no slots that weekday, a closure, outside the window, or inside the lead time);
  - each slot reports its free tables;
  - capacity counts `pending`, `accepted`, `confirmed` and `unconfirmed`; one reservation is one
    table, whatever the party size.
- `createReservation`: a single `INSERT … SELECT … WHERE (holding reservations in the slot) <
capacity AND NOT closed`. One statement is atomic in D1, so two guests racing for the last table
  cannot both get it.
- Reads that touch pending reservations accept overdue ones lazily, like redemption expiry, in
  addition to the cron.

## Phase 3: public API and `/reservar`

Public `reservations` router (host-resolved tenant, like the loyalty router):

- `availability({ from, to })`.
- `create({ date, minute, partySize, name, phone, email, consent: true, language })`:
  - phone matches `^\+[1-9]\d{7,14}$`, party size within the online limit, consent is the literal
    `true`, the slot is bookable;
  - `RESERVATION_LIMITER` by IP;
  - inserts a `pending` reservation with `respond_by`, sends "request received" to the guest and "new
    request" to the owners, and emits `reservation.requested`.
- `byEmail({ email })`: the reservations for that email at this branch (ADR 0004).
- `cancel({ reservationId, email })`: the email must match; allowed until the slot starts.

Feature gate: `apps/api/src/modules/public-menu/get-public-menu.ts:59` adds
`publicFeatures.reservations`, true when the branch plan has it, the restaurant turned it on, and at
least one slot exists.

Route `apps/web/src/app/routes/{-$locale}.reservar.tsx`:

- When unavailable: the unavailable state and `noIndex`, like `{-$locale}.puntos.tsx:26`; filtered
  out of `sitemap[.]xml.ts:46`; the tab hidden in `public-bottom-nav.tsx:82`.
- Steps:
  1. **Date and slot**: the calendar, then the day's slots as buttons, full ones disabled.
  2. **Party size**: up to the online limit; above it, "Para grupos más grandes, llámanos" with
     `branches.phone`.
  3. **Contact**: name, phone (country prefix defaulting from `restaurants.country_code`, normalized
     like `normalizePhone` in `map-public-contact-content.ts:56-59`) and email, all required.
  4. **Review**: a summary, a required checkbox agreeing to messages about this reservation by
     WhatsApp and email (linked to `/privacidad`), and _Send request_.
- Afterwards the route lists the guest's reservations at that branch. The email is remembered in
  `localStorage` under `qm-reservations-email:${host}` (pattern `use-loyalty-card-token.ts`, read
  with `useSyncExternalStore`); on another device anyone can type the email. Each reservation can be
  cancelled until its slot starts.
- Times display in the restaurant's timezone.
- New Lit component `qm-calendar` in `packages/ui/src/components/molecules/`, using `qm-code-input`
  as the template: `index.ts` extending `QmElement`, `styles.css?inline` using only `--qm-*` tokens,
  `react.ts` wrapper, the `package.json` export and the `jsx-types.ts` entry. It shows each day's
  state and emits a `qm-*` select event.
- Copy in all 14 locale files under `apps/web/src/lib/i18n/resources/`.
- `/privacidad`: add the reservation processing (WhatsApp and email about the guest's own
  reservation) and the 90-day anonymization.

## Phase 4: admin

API `admin.reservations`: `tenantProcedure` + `requirePermission(…, "reservations.manage")` +
`assertBranchAccess` + `requireFeature(ctx, { feature: "reservations", branchId })`.

- `day({ branchId, date })`: reservations grouped by slot, pending and unconfirmed first, with the
  contact details.
- `pendingCount({ branchId })` for the nav badge.
- `accept`, `decline`, `cancel` (`{ reservationId }`), each `CONFLICT` when another device answered
  first.
- `settings` get and save; `saveSlots` per weekday, with "copy to all days"; closures list, add and
  remove (a date or a single slot).

UI, in `apps/admin/src/features/reservations/`:

- A `reservations` entry in `SECTIONS` (`app/shell/admin-shell.tsx:39-83`) with
  `permission: "reservations.manage"` and `feature: "reservations"`. `NavListItem` has no badge prop,
  so the pending count renders inside its `label`.
- Tabs like `features/loyalty/pages/loyalty-layout.tsx`:
  - **Today**: a day picker, reservations grouped by slot, pending and unconfirmed first, each row
    expanding to the contact details, Accept / Decline / Cancel (`ConfirmAction` on Decline and
    Cancel), refetched about every minute while open;
  - **Settings**: on/off, slots per weekday, slot capacity, online party limit, window, lead time,
    response time, attendance check timing;
  - **Closures**: close a date or a single slot.

## Phase 5: lifecycle jobs

`runReservationJobs(now)` runs in the minute cron next to the branch 1 and 2 jobs:

1. **Automatic acceptance**: `pending` with `respond_by ≤ now` becomes `accepted` (automatic), the
   guest gets the "accepted" email, and the `reservation.requested` notification is handled.
2. **Attendance check**: `accepted`, no check sent, `now ≥ starts_at − check_before` and
   `now < starts_at − check_deadline` sends the `reservation_attendance` template through
   `MSG_WORKER` with `ref` = the reservation id, then sets `check_sent_at`. This sends right away when
   staff accept later than the check time, and skips it when they accept after the deadline. The
   template uses the guest's language when it is `es` or `en`, otherwise `es`.
3. **Unconfirmed**: `accepted` with the check sent and `now ≥ starts_at − check_deadline` becomes
   `unconfirmed` (it keeps its table) and emits `reservation.unconfirmed`.
4. **Slot started**: unhandled `reservation.unconfirmed` notifications whose slot has started are
   handled.
5. **Anonymization**: `starts_at < now − 90 days` and not anonymized: null the name, phone and email,
   set `anonymized_at`.

Messaging consumer, `button` events matched by `ref`:

- `confirm`: `accepted` or `unconfirmed` becomes `confirmed`; an open `reservation.unconfirmed`
  notification is handled.
- `cancel`: cancelled by the guest, with the same emails and notifications as a cancellation from
  `/reservar`.

## Phase 6: emails and notifications

Emails, following the design's table (guest emails in the guest's site language; owner emails to
owners only, never support accounts):

| Event                                | To                                        |
| ------------------------------------ | ----------------------------------------- |
| Request received                     | Guest                                     |
| New request                          | Owners                                    |
| Accepted (by staff or automatically) | Guest                                     |
| Declined, with the branch phone      | Guest                                     |
| Cancelled (by anyone)                | Guest; owners too if it had been accepted |

Notification types in `apps/api/src/modules/notifications/events.ts`:

| Type                      | Actionable: handled when                                     | Push     |
| ------------------------- | ------------------------------------------------------------ | -------- |
| `reservation.requested`   | accepted, declined, accepted automatically, or cancelled     | one each |
| `reservation.cancelled`   | not actionable; only for reservations that had been accepted | one each |
| `reservation.unconfirmed` | staff cancel it, or its slot starts                          | one each |

Push text has no guest data: "Nueva solicitud de reserva · Tapas Centro · vie 21:00 · 4 personas".
The item URL is `/reservations?date=<slot date>`.

## Phase 7: docs and operations

- New `docs/domains/reservations.md` (domain-page structure) and its README row; the design rows for
  the reservations, notifications and stamp-request pages.
- `docs/operations/deployment.md`: the `MSG_WORKER` binding, the `ming-msg-events-*` queues and
  DLQs, the `RESERVATION_LIMITER` binding, and the external prerequisites above.

## Verification

- `bun run check`, `bun run lint`, `bun run build`, `bun run test`, `bun run test:e2e`. No new specs
  unless asked (AGENTS.md).
- Manual, on `tapas.localhost/reservar` with the admin open:
  1. Book until a slot is full: its button disables, and the day turns _full_ when every slot is.
  2. Send two requests for the last table at the same time: exactly one succeeds.
  3. Accept and decline from Today; check the guest and owner emails and the inbox rows.
  4. Set a short response time and run the cron (`--test-scheduled`): the request is accepted
     automatically.
  5. On the development worker with a real phone: the attendance check arrives, and Confirm and
     Cancel round-trip to the reservation.
  6. Let a check go unanswered past the deadline: the reservation shows as unconfirmed, with a push
     and an inbox row.
  7. Back-date a reservation by 91 days and run the cron: its contact data is anonymized.

## Not in this branch

The design's "Not in version 1" list: table maps and meal durations, entering phone bookings by
hand, loyalty links, a free-text WhatsApp agent, and a "few left" calendar state.
