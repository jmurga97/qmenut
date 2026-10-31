# Reservations

## Status

Reservations version 1 is implemented as designed in
[reservations-ux.md](../design/reservations-ux.md) and ADRs
[0004](../adr/0004-reservation-access-by-email-alone.md) and
[0008](../adr/0008-reservations-are-booked-and-confirmed-by-email.md). The original plan is
[docs/plans/reservations.md](../plans/reservations.md); ADR 0008 replaced its staff answers and
WhatsApp check. Terms follow the _Reservations_ section of [CONTEXT.md](../../CONTEXT.md).

- Implemented: instant booking on `/reservar` (calendar, slot, party size, contact), guest
  confirmation and cancellation by email or manage link, the admin section (Day, Settings,
  Closures), the reminder email, 90-day anonymization, three guest emails and two staff
  notifications.
- Behind the `reservations` plan feature (Business) and the `reservations.manage` permission
  (owner, admin and staff). The admin section is also hidden by `FEATURES.reservations` in
  `apps/admin/src/lib/features.ts`.
- Deployment prerequisite: the matching guest templates in `ming-email-worker` (see [Limitations](#limitations)).

## Data model

Tables live in `packages/db/src/schema/reservations.ts` (migrations `0016_reservations.sql`, then
`0018`–`0019` for ADR 0008).

| Table                  | Purpose                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `reservation_settings` | One row per branch: on/off, slot capacity, party limit, window, lead time, reminder time.  |
| `reservation_slots`    | Weekly start times per branch (`weekday` 0 = Sunday, `start_minute` after local midnight). |
| `reservation_closures` | A closed date (`start_minute` null) or a single closed slot.                               |
| `reservations`         | One row per booking. It counts once against slot capacity, whatever the party size.        |

A reservation keeps its local `slot_date` and `slot_minute` and the UTC `starts_at` computed from
`restaurants.timezone` at booking time (`packages/db/src/domain/local-time.ts`). Status is
`pending` (booked, not confirmed), `confirmed` or `cancelled` (`cancelled_by` guest or staff);
`pending` and `confirmed` hold a table (`HOLDING_STATUSES`). `check_sent_at` claims the reminder;
`anonymized_at` marks rows whose name, phone and email were nulled. Reservations cascade with
their branch. The settings column `check_before_minutes` is the reminder time.

## Backend

- **Booking**: `createReservation` in `packages/db/src/repositories/reservations.repository.ts` is
  one `INSERT … SELECT` that checks the weekly slot, closures and capacity, so two guests racing for
  the last table cannot both get it. It inserts `pending` and returns `full` or `unavailable` when
  the insert did not happen.
- **Public router** `reservations` (`modules/reservations/reservations.router.ts`, handlers in
  `public-reservations.ts`), all `publicProcedure` on the tenant host: `availability`, `create`,
  `byEmail`, `emailFromLink`, `confirm` and `cancel`. Availability and creation require the plan
  feature, the branch's switch and at least one slot. Existing guests can still look up, confirm
  and cancel reservations after bookings are switched off, slots are removed or the branch
  downgrades. Every procedure except `availability` goes through the `RESERVATION_LIMITER` rate
  limit (10 a minute per branch and IP), because they send emails to, or reveal reservations for,
  any address typed in.
- **Manage link**: guest emails link to `https://<branch domain>/<guest language>/reservar?reserva=<id>`.
  `emailFromLink` is a query that returns the reservation's email so the page can open that guest's
  list; it changes nothing. `confirm` and `cancel` take the email and the id
  (`answerGuestReservation`), so confirming always takes a tap.
- **Admin router** `admin.reservations` (`modules/admin-reservations/admin-reservations.router.ts`),
  all `tenantProcedure`. Every procedure requires `reservations.manage`, checks the branch belongs
  to the restaurant and that its plan has `reservations`. Procedures: `day`, `cancel`, `settings`,
  `saveSettings` (settings and weekly slots in one batch; it bumps the branch's public content
  version), `closures`, `addClosure` and `removeClosure`.
- **Cron**: `runReservationJobs` (`reservation-jobs.ts`) runs in the minute cron next to the
  notification jobs. Two isolated steps: `claimDueReminders` claims up to 50 pending reservations
  whose reminder time has passed (skipping ones booked after it) and sends their reminder; then
  reservations 90 days past their slot are anonymized. A reminder the email worker drops is not
  retried (`ponytail:` comment).
- **Emails and notifications**: `announceReservations` (`reservation-messages.ts`) is called after
  each change commits and never throws. It loads the reservation with its branch and restaurant,
  sends the guest email through `EMAIL_WORKER` and emits the notification:

| Event                 | Guest email (template)  | Notification            |
| --------------------- | ----------------------- | ----------------------- |
| Booked (`create`)     | `reservation-booked`    | `reservation.booked`    |
| Reminder (cron)       | `reservation-reminder`  | None                    |
| Cancelled by guest    | `reservation-cancelled` | `reservation.cancelled` |
| Cancelled by staff    | `reservation-cancelled` | None                    |
| Confirmed (`confirm`) | None                    | None                    |

Email `data`: `restaurantName`, `branchName`, `branchPhone`, `date`, `time`, `partySize`,
`guestName`, `locale` (= `guest_language`) and `manageUrl` (null while the branch has no domain).
Both notification types (`modules/notifications/events.ts`) are informational, push one each with
no guest data ("Nueva reserva · Tapas Centro · vie 21:00 · 4 personas"), and open
`/reservations?date=<slot date>`.

## Frontend

- **Public**: `apps/web/src/app/routes/{-$locale}.reservar.tsx` (reads `?reserva`) and
  `apps/web/src/features/reservations/`: the booking flow (`use-booking-flow.ts`), the guest's
  reservations remembered by email in `localStorage` and opened by the manage link
  (`use-guest-reservations.ts`), and the `qm-calendar` Lit component in `packages/ui`. The
  bottom-nav tab appears when the public menu's `publicFeatures.reservations` is true
  (`modules/public-menu/get-public-menu.ts`).
- **Admin**: routes `apps/admin/src/app/routes/_auth.reservations*.tsx` and
  `apps/admin/src/features/reservations/`: Day (reads `?date`, refreshes every minute), Settings
  and Closures. Inbox text for the two notification types is in
  `apps/admin/src/features/notifications/services.ts`.

## Example: a booking the guest confirms

1. A guest books 21:00 for four on `tapas.localhost/reservar`. `createPublicReservation` checks the
   gate and the rate limit, and `createReservation` inserts the row as `pending`.
2. `announceReservations` emails `reservation-booked` to the guest and emits
   `reservation.booked`; devices following the branch get a push. Staff see the row as
   _Sin confirmar_ on the Day tab.
3. 24 hours before the slot the cron claims the reservation and emails `reservation-reminder`.
4. The guest opens the manage link. `/reservar` calls `emailFromLink`, remembers the email and
   lists the reservation; the guest taps _Confirmar asistencia_ and `confirm` moves it to
   `confirmed`. Staff see _Confirmada_ on the next refresh.

## Key files

| Path                                                                   | Responsibility                                  |
| ---------------------------------------------------------------------- | ----------------------------------------------- |
| `packages/db/src/schema/reservations.ts`                               | Tables                                          |
| `packages/db/src/repositories/reservations.repository.ts`              | Availability, atomic booking, transitions, jobs |
| `packages/db/src/domain/local-time.ts`                                 | Restaurant-local dates and minutes              |
| `apps/api/src/modules/reservations/public-reservations.ts`             | Public handlers, gate and rate limit            |
| `apps/api/src/modules/admin-reservations/admin-reservations.router.ts` | Admin procedures                                |
| `apps/api/src/modules/reservations/reservation-jobs.ts`                | Minute-cron reminders and anonymization         |
| `apps/api/src/modules/reservations/reservation-messages.ts`            | Emails and notifications                        |
| `apps/web/src/features/reservations/`                                  | `/reservar`                                     |
| `apps/admin/src/features/reservations/`                                | Admin section                                   |

## Limitations

- The three guest templates are implemented in `ming-email-worker`; deploy that worker before
  this caller. It renders English for English locales and Spanish otherwise. A rejected email
  is reported to Sentry, and the reservation change stands.
- `EMAIL_WORKER` is `remote: true` for local `wrangler dev` and the E2E API: a reservation booked
  locally emails the real worker. There are no reservation E2E specs.
- The manage link is `https://` on the branch's custom domain, so links from local or E2E bookings
  don't open the local site.
- Capacity is one number per branch and slot; there are no table maps or meal durations.
