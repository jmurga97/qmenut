# Reservations

## Status

Reservations version 1 is implemented as designed in
[reservations-ux.md](../design/reservations-ux.md) and ADRs
[0003](../adr/0003-whatsapp-through-ming-msg-worker.md),
[0004](../adr/0004-reservation-access-by-email-alone.md) and
[0005](../adr/0005-unanswered-reservations-are-accepted.md), with the plan in
[docs/plans/reservations.md](../plans/reservations.md). Terms follow the _Reservations_ section of
[CONTEXT.md](../../CONTEXT.md).

- Implemented: guest requests on `/reservar` (calendar, slot, party size, contact), guest
  cancellation by email alone, the admin section (Day, Settings, Closures), automatic acceptance of
  unanswered requests, the WhatsApp attendance check with Confirm and Cancel, unconfirmed
  reservations, 90-day anonymization, the five reservation emails, and three staff notifications.
- Behind the `reservations` plan feature (Business) and the `reservations.manage` permission
  (owner, admin and staff).
- Not yet: the five email templates in `ming-email-worker` and the English attendance template in
  `ming-msg-worker` (see [Limitations](#limitations)).

## Data model

Tables live in `packages/db/src/schema/reservations.ts` (migration `0016_reservations.sql`).

| Table                  | Purpose                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `reservation_settings` | One row per branch: on/off, slot capacity, party limit, window, lead, response and check times. |
| `reservation_slots`    | Weekly start times per branch (`weekday` 0 = Sunday, `start_minute` after local midnight).      |
| `reservation_closures` | A closed date (`start_minute` null) or a single closed slot.                                    |
| `reservations`         | One row per request. It holds one restaurant table, whatever the party size.                    |

A reservation keeps its local `slot_date` and `slot_minute` and the UTC `starts_at` computed from
`restaurants.timezone` at booking time (`packages/db/src/domain/local-time.ts`). Status moves
`pending → accepted → confirmed | unconfirmed`, or ends in `declined` or `cancelled`
(`cancelled_by` guest or staff). `pending`, `accepted`, `confirmed` and `unconfirmed` hold a table
(`HOLDING_STATUSES`). `respond_by` is ADR 0005's deadline; `check_sent_at` claims the attendance
check; `anonymized_at` marks rows whose name, phone and email were nulled. Reservations cascade
with their branch.

The WhatsApp transport's events are stored in `messaging_events`
(`packages/db/src/schema/messaging.ts`, migration `0015`), with `ref` = the reservation id.

## Backend

- **Booking**: `createReservation` in `packages/db/src/repositories/reservations.repository.ts` is
  one `INSERT … SELECT` that checks the weekly slot, closures and capacity, so two guests racing for
  the last table cannot both get it. It returns `full` or `unavailable` when the insert did not
  happen.
- **Public router** `reservations` (`modules/reservations/reservations.router.ts`, handlers in
  `public-reservations.ts`), all `publicProcedure` on the tenant host: `availability`, `create`,
  `byEmail` and `cancel`. The gate is the plan feature, the branch's switch and at least one slot.
  `create`, `byEmail` and `cancel` go through the `RESERVATION_LIMITER` rate limit (10 a minute per
  branch and IP), because they send emails to, or reveal reservations for, any address typed in.
- **Admin router** `admin.reservations` (`modules/admin-reservations/admin-reservations.router.ts`),
  all `tenantProcedure`. Every procedure requires `reservations.manage`, checks the branch belongs
  to the restaurant and that its plan has `reservations`. Procedures: `day`, `pendingCount`,
  `accept`, `decline`, `cancel`, `settings`, `saveSettings` (settings and weekly slots in one batch;
  it bumps the branch's public content version), `closures`, `addClosure` and `removeClosure`.
- **Automatic acceptance**: `acceptOverdueReservations` (`accept-overdue-reservations.ts`) is the
  one entry point. The cron and every read that shows pending reservations (`day`, `pendingCount`,
  `byEmail`) call it, so a request is never shown pending past `respond_by`.
- **Lifecycle cron**: `runReservationJobs` (`reservation-jobs.ts`) runs in the minute cron next to
  the notification jobs. Steps, each isolated: accept overdue requests, send due attendance checks
  through `MSG_WORKER` (logged and skipped when the binding is missing), mark checked and unanswered
  reservations `unconfirmed` past the deadline, handle unconfirmed notifications whose slot started,
  and anonymize reservations 90 days after their slot.
- **WhatsApp answers**: the `queue` handler sends `ming-msg-events-*` batches to
  `handleMessagingEvents` (`modules/messaging/handle-messaging-events.ts`). A `confirm` button
  confirms an accepted or unconfirmed reservation; `cancel` cancels it as the guest.
- **Emails and notifications**: `announceReservations` (`reservation-messages.ts`) is called after
  each change commits and never throws. It loads the reservation, its branch and the restaurant's
  active owners (never support accounts), sends the emails through `EMAIL_WORKER`, emits or handles
  the notifications:

| Event                      | Emails (template)                                              | Notifications                                                                                          |
| -------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Request (`create`)         | Guest `reservation-received`, owners `reservation-new-request` | Emits `reservation.requested`                                                                          |
| Accepted (staff or cron)   | Guest `reservation-accepted`                                   | Handles `reservation.requested`                                                                        |
| Declined                   | Guest `reservation-declined` (carries `branchPhone`)           | Handles `reservation.requested`                                                                        |
| Cancelled (guest or staff) | Guest `reservation-cancelled`; owners too if it was accepted   | Emits `reservation.cancelled` for a guest cancel of an accepted one; handles requested and unconfirmed |
| Unconfirmed (cron)         | None                                                           | Emits `reservation.unconfirmed`                                                                        |
| Confirmed (WhatsApp)       | None                                                           | Handles `reservation.unconfirmed`                                                                      |

Guest emails carry `locale` = `guest_language`; owner emails carry `locale: "es"` and a `panelUrl`
to the admin day. The three notification types (`modules/notifications/events.ts`) push one each,
with no guest data ("Nueva solicitud de reserva · Tapas Centro · vie 21:00 · 4 personas"), and open
`/reservations?date=<slot date>`.

## Frontend

- **Public**: `apps/web/src/app/routes/{-$locale}.reservar.tsx` and
  `apps/web/src/features/reservations/`: the booking flow (`use-booking-flow.ts`), the guest's
  reservations remembered by email in `localStorage` (`use-guest-reservations.ts`), and the
  `qm-calendar` Lit component in `packages/ui`. The bottom-nav tab appears when the public menu's
  `publicFeatures.reservations` is true (`modules/public-menu/get-public-menu.ts`).
- **Admin**: routes `apps/admin/src/app/routes/_auth.reservations*.tsx` and
  `apps/admin/src/features/reservations/`: Day (reads `?date`, refreshes every minute), Settings
  and Closures, plus the pending-count badge in the nav. Inbox text for the three notification types
  is in `apps/admin/src/features/notifications/services.ts`.
- **Messaging console**: `/messaging` (`apps/admin/src/features/messaging/`), for internal support
  accounts only, sends test templates through `MSG_WORKER`.

## Example: a request answered by staff

1. A guest books 21:00 for four on `tapas.localhost/reservar`. `createPublicReservation`
   (`public-reservations.ts:91`) checks the gate and the rate limit, and `createReservation` inserts
   the row as `pending` with `respond_by`.
2. `announceReservations` sends `reservation-received` to the guest and `reservation-new-request`
   to each owner, and emits `reservation.requested`; devices following the branch get a push.
3. Staff open the push, land on `/reservations?date=…` and tap _Accept_. `admin.reservations.accept`
   moves the row to `accepted` only if it is still `pending`, emails `reservation-accepted` and marks
   the notification handled ("Aceptado por …").
4. Two hours before the slot the cron sends the attendance check. The guest taps _Confirm_; the
   queue event moves the reservation to `confirmed`.

## Key files

| Path                                                                   | Responsibility                                  |
| ---------------------------------------------------------------------- | ----------------------------------------------- |
| `packages/db/src/schema/reservations.ts`                               | Tables                                          |
| `packages/db/src/repositories/reservations.repository.ts`              | Availability, atomic booking, transitions, jobs |
| `packages/db/src/domain/local-time.ts`                                 | Restaurant-local dates and minutes              |
| `apps/api/src/modules/reservations/public-reservations.ts`             | Public handlers, gate and rate limit            |
| `apps/api/src/modules/admin-reservations/admin-reservations.router.ts` | Admin procedures                                |
| `apps/api/src/modules/reservations/accept-overdue-reservations.ts`     | Automatic acceptance (ADR 0005)                 |
| `apps/api/src/modules/reservations/reservation-jobs.ts`                | Minute-cron lifecycle                           |
| `apps/api/src/modules/reservations/reservation-messages.ts`            | Emails and notifications                        |
| `apps/api/src/modules/messaging/`                                      | `MSG_WORKER` client and queue consumer          |
| `apps/web/src/features/reservations/`                                  | `/reservar`                                     |
| `apps/admin/src/features/reservations/`                                | Admin section                                   |

## Limitations

- The five email templates do not exist in `ming-email-worker` yet, and no email sends a `locale`
  today. Until they ship these emails are not delivered; `announceReservations` reports a non-2xx
  answer to Sentry and the reservation change stands.
- `ming-msg-worker` registers `reservation_attendance` in `es` only and its `send` takes no
  language, so every guest gets the Spanish check (`ponytail:` comment in `reservation-jobs.ts`).
- Owner emails are always Spanish: owners have no stored language outside push devices.
- `EMAIL_WORKER` is `remote: true` for local `wrangler dev` and the E2E API: a reservation booked
  locally emails the real worker. There are no reservation E2E specs.
- Capacity is one number per branch and slot; there are no table maps or meal durations.
