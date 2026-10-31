# Notifications

## Status

Staff notifications version 1 is implemented as designed in
[notifications-ux.md](../design/notifications-ux.md) and
[ADR 0006](../adr/0006-notifications-through-cloudflare-queues.md), with the plan in
[docs/plans/notifications.md](../plans/notifications.md).

- Implemented: the inbox (bell, badge, `/notifications` page), per-member read state and shared
  handled state, Web Push to devices that follow branches, 30-day retention, and announcements as
  a repository function.
- Live events: **reward redemption waiting** (`loyalty.redemption`), **stamp request**
  (`loyalty.stampRequest`), and the informational reservation events **new reservation**
  (`reservation.booked`) and **cancelled by the guest** (`reservation.cancelled`); see
  [Reservations](reservations.md).
- Not yet: a tool for writing announcements.

## Data model

All three tables live in `packages/db/src/schema/notifications.ts`.

| Table                     | Purpose                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| `notifications`           | One row per event: type, branch (null = every branch), facts, shared handled state, expiry. |
| `notification_recipients` | One row per member who can open the admin when the event happened, with `read_at`.          |
| `push_devices`            | A browser's push subscription per member, its admin language and followed branches.         |

`(type, subject_id)` is unique, so emitting the same event twice is a no-op. `type` has no SQL
check: the event map in `apps/api/src/modules/notifications/events.ts` is the source of truth.

## Backend

- **Recipients**: `insertRecipients` in `packages/db/src/repositories/notifications.repository.ts`
  selects active members of a live restaurant, excluding `INTERNAL_SUPPORT_EMAILS`, who are owners
  or belong to a restaurant with a plan that includes `users`. That mirrors the Basic gate in
  `tenantProcedure`, so a member gets notifications from the moment they can open the admin.
- **Emit**: `emitNotification` (`modules/notifications/emit-notification.ts`) writes the
  notification and its recipients, then queues one `{ notificationId, deviceId }` message per
  device that follows the branch. It never throws.
- **Handle**: features call `markNotificationsHandled` with an outcome (`validated`, `rejected`,
  `cancelled`, `cancelledByStaff`, `confirmed`, `expired`, `accepted`, `autoAccepted`, `declined`). Redemption expiry and stamp
  request auto-acceptance mark their notifications inside `expireStaleRedemptions` and
  `acceptOverdueStampRequests`, so every lazy caller and the cron are covered.
  `reopenNotification` clears the handled state when a subject goes back to waiting.
- **Push modes** (`events.ts`): `each` sends one push per event, dropped once handled; `never`
  is inbox only; `branchCount` sends one replaceable push per branch with the number of
  unhandled notifications of that type, skipped at 0. Its `tag` and `Topic` are per type and
  branch (`sendWebPush` hashes the topic to fit RFC 8030's 32 characters). An event's `url` is the
  admin path the push opens; it can be built from the facts (reservations open their slot's day).
  Push links carry the restaurant and branch; the admin checks access, selects that branch, then
  consumes those target parameters so later manual branch changes are preserved.
- **Delivery**: the `queue` handler in `apps/api/src/index.ts` sends queue names starting with
  `qmenut-notifications` to `consumePushMessages` (`notification-jobs.ts`). It skips handled or
  expired notifications, rechecks active membership and current admin eligibility, deletes devices on
  404/410, retries 429/5xx, and acks other 4xx after reporting them. Exhausted retries go to the `-dlq` queue.
- **Web Push**: `apps/api/src/lib/web-push.ts` signs VAPID JWTs and encrypts payloads
  (`aes128gcm`, RFC 8291) with WebCrypto only. Push is off unless `VAPID_PUBLIC_KEY`,
  `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` are set.
- **Cron**: the minute cron runs `runNotificationMaintenance`: deletes expired notifications,
  expires stale redemptions and accepts stamp requests unanswered for 12 h, across all
  restaurants.
- **tRPC**: `admin.notifications` (`notifications.router.ts`), all plain `tenantProcedure`:
  `list`, `badge`, `markRead`, `markAllRead`, `pushConfig`, `device`, `saveDevice`, `removeDevice`.

## Frontend

- `apps/admin/src/features/notifications/`: the bell in the topbar (badge polled every minute and
  refreshed on service-worker messages), the page, the push device control, and `services.ts`,
  which renders text from the type and facts in the admin language.
- `apps/admin/public/sw.js`: push and notification-click handlers only. It is registered through
  the Trusted Types policy `qmenut-service-worker`, listed in `apps/admin/public/_headers`.
- On iPhone and iPad, push works only in the installed admin; outside it the control explains how
  to add it to the home screen.

## Example: a redemption waiting

1. A guest taps "Canjear" on `tapas.localhost/puntos`. `request-redemption.ts` stores the
   redemption with the host's branch and calls `emitNotification` with type `loyalty.redemption`.
2. Every eligible member gets a recipient row; the bell's badge counts it on that branch.
3. Each push device following the branch receives "Canje pendiente · Tapas Centro · Café gratis".
4. Staff validate it from Fidelidad. `validate-redemption.ts` marks it handled; the row greys out
   with "Validado por …" for everyone and leaves every badge.

## Key files

| Path                                                       | Responsibility                            |
| ---------------------------------------------------------- | ----------------------------------------- |
| `packages/db/src/schema/notifications.ts`                  | Tables                                    |
| `packages/db/src/repositories/notifications.repository.ts` | Recipients, inbox, devices, announcements |
| `apps/api/src/modules/notifications/events.ts`             | Event types and push text                 |
| `apps/api/src/modules/notifications/emit-notification.ts`  | Emit                                      |
| `apps/api/src/modules/notifications/notification-jobs.ts`  | Queue consumer and cron maintenance       |
| `apps/api/src/lib/web-push.ts`                             | VAPID and payload encryption              |
| `apps/admin/src/features/notifications/`                   | Bell, page, push control                  |
| `apps/admin/public/sw.js`                                  | Service worker                            |

## Limitations

- The push control lives on the notifications page only; the admin has no user menu yet.
- Announcements can be published only through `publishAnnouncement`; the ops dashboard that calls
  it does not exist yet.
- Push delivery has no automated test. The encryption was checked by a decrypt round trip.
