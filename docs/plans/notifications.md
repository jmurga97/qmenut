# Staff notifications v1: implementation plan

Status: planned, not started. Branch `feat/notifications`, cut from `main` (04d1b92).

This plan implements [notifications-ux.md](../design/notifications-ux.md) and
[ADR 0006](../adr/0006-notifications-through-cloudflare-queues.md). Terms follow the
_Notifications_ section of [CONTEXT.md](../../CONTEXT.md).

## Ship order

The three planned features ship stacked, each branch on top of the previous one:

1. **Notifications** (this plan, `feat/notifications`).
2. Loyalty stamp requests ([loyalty-stamp-requests.md](loyalty-stamp-requests.md),
   `feat/loyalty-stamp-requests`).
3. Reservations ([reservations.md](reservations.md), `feat/reservations`).

Notifications is the generic piece the other two emit into, so it ships first. The only event
that exists in the code today, **reward redemption waiting**, is wired here. Stamp-request events
come with branch 2 and reservation events with branch 3; their types are reserved here.

## What exists today

- No queues, no queue consumer, no inbox tables, no service worker in the admin, no push crypto.
- `apps/api/src/index.ts` exports only `fetch` and `scheduled`. The minute cron runs
  `publishPendingImages`; `45 4 * * *` runs the analytics job (production only).
- Members are `restaurant_users` (`packages/db/src/schema/tenancy.ts:125-152`, roles owner, admin,
  staff). Basic is owner-only, enforced in `tenantProcedure` (`apps/api/src/trpc/trpc.ts:50-57`).
- Support accounts are an email allowlist, not a role (`packages/permissions/src/index.ts:3-14`).
  The ops repo seeds them as `admin` members of every tenant, so they must be filtered by email.
- The admin language is not stored anywhere; `apps/admin/src/lib/i18n.ts` detects it from the
  browser on every load.
- The admin already has a web manifest and an install prompt (`use-install-prompt.ts`), but no
  service worker. `docs/apps/web-pwa.md:8` still says the admin is not installable.
- Redemptions have a nullable `branch_id` column that `createRedemption` never fills.
- Redemption expiry is lazy only (`expireStaleRedemptions`, called from five places).

## Decisions taken while planning

These are not in the design; they were settled while writing this plan.

- The badge counts the **selected branch** (plus announcements), the same filter as the page.
  Otherwise the badge would count items the page hides.
- Redemption notifications are also handled on **reject** (staff) and **cancel** (guest), not only
  on validate and expire.
- The admin has no user menu. The push control lives on the notifications page and in the sidebar
  footer next to "install" (`apps/admin/src/app/shell/admin-sidebar.tsx:89-108`).
- The admin route is `/notifications` (admin routes use English paths). It is not a nav section;
  the bell opens it.
- `notifications.type` has no SQL `CHECK`, so later branches add types without a table rebuild. The
  TypeScript `as const` list is the source of truth.
- Push is off when the VAPID secrets are missing (local dev without keys): emit skips enqueueing and
  the admin hides the push control. The inbox still works.
- Announcements **fan out at write time**: one notification row per targeted restaurant, with
  recipients resolved then. "Members receive notifications from the moment they can open the admin"
  then holds for announcements too, and no extra table is needed.

## Phase 1: schema and migration

New `packages/db/src/schema/notifications.ts`, exported from the barrel
`packages/db/src/schema/index.ts` (Drizzle Kit only reads the barrel).

`notifications`, one row per event:

| Column            | Notes                                                                       |
| ----------------- | --------------------------------------------------------------------------- |
| `id`              | text primary key                                                            |
| `restaurant_id`   | fk `restaurants`, cascade                                                   |
| `branch_id`       | fk `branches`, set null; nullable. Null means every branch (announcements). |
| `type`            | text, no `CHECK` (see decisions)                                            |
| `subject_id`      | text, nullable: the redemption, stamp request or reservation id             |
| `facts_json`      | text, default `'{}'`: the facts the text is built from                      |
| `actionable`      | integer boolean                                                             |
| `handled_at`      | integer, nullable. Shared by every member.                                  |
| `handled_by`      | fk `restaurant_users`, set null. Handled with null means automatic or guest |
| `handled_outcome` | text, e.g. `validated`, `expired`, `cancelled`, `autoAccepted`              |
| `created_at`      | integer                                                                     |
| `expires_at`      | integer, not null: `created_at + 30 days`, or the announcement end date     |

Indexes: unique `(type, subject_id)` (idempotent emit and the lookup when handling; SQLite lets NULL
subject ids repeat), `(restaurant_id, branch_id, created_at)`, `(expires_at)`.

`notification_recipients`, per-member read state:

- `notification_id` fk cascade, `membership_id` fk `restaurant_users` cascade, `read_at` nullable.
- Primary key `(notification_id, membership_id)`; index `(membership_id, read_at)`.

`push_devices`:

- `id`, `membership_id` fk cascade, `endpoint` unique, `p256dh`, `auth`, `language` (`es` or `en`,
  the admin language when push was turned on), `branch_ids` (JSON array, filtered with `json_each`),
  `created_at`, `updated_at`.

Generate with `bun run db:generate -- --name notifications` and commit the SQL with
`apps/api/migrations/meta/`.

## Phase 2: core (emit, handle, recipients)

`packages/db/src/repositories/notifications.repository.ts`:

- `insertNotification`: `ON CONFLICT DO NOTHING RETURNING id`, so emitting the same event twice is a
  no-op.
- `insertRecipients(notificationId)`: one `INSERT … SELECT` of the eligible members:
  - active `restaurant_users` of a restaurant that is not deleted;
  - `users.email NOT IN INTERNAL_SUPPORT_EMAILS`;
  - `role_code = 'owner'`, **or** the restaurant has a branch whose plan includes the `users`
    feature. This mirrors the Basic gate in `tenantProcedure`. Derive the plan codes from
    `PLAN_FEATURES` instead of hardcoding `'business'`.
  - Style to copy: the owner query in
    `apps/api/src/modules/analytics/digest/digest-deliveries.ts:62-66`.
- `markNotificationHandled({ type, subjectIds, handledBy, outcome })`, guarded by
  `WHERE handled_at IS NULL`.
- Inbox reads and writes: list, badge count, mark read, mark all read.
- `listPushTargets(notificationId)`: the push devices of the recipients whose `branch_ids` contain
  the notification's branch.
- `upsertPushDevice` by endpoint. If another member signs in on the same browser, the device moves to
  that member.
- `deletePushDevice`, `deleteExpiredNotifications(now)`.

`apps/api/src/modules/notifications/`:

- `events.ts`: an `as const` map per type with `{ actionable, push, url }`. `push` is `"each"` or
  `"never"` here; branch 2 adds `"branchCount"`.
  - Live in this branch: `loyalty.redemption` (actionable, push each, URL `/loyalty`) and
    `announcement` (not actionable, never pushed).
  - Reserved: `loyalty.stampRequest`, `reservation.requested`, `reservation.cancelled`,
    `reservation.unconfirmed`.
- `push-text.ts`: es and en title and body per type, built from the facts and the branch name, with
  no guest personal data. Example: "Canje pendiente · Tapas Centro · Café gratis".
- `emit-notification.ts`: insert the notification, insert its recipients, then, if the type pushes
  and VAPID is configured, `NOTIFICATIONS_QUEUE.sendBatch` one message `{ notificationId, deviceId }`
  per target device, in chunks of 100. The whole call is wrapped in try/catch and reported to Sentry:
  a notification failure never fails the guest or staff action that caused it.

## Phase 3: Web Push inside the Worker

No new dependency. `apps/api/src/lib/web-push/`, following the base64url and WebCrypto style of
`apps/api/src/lib/loyalty/token.ts`:

- `vapid.ts`: an ES256 JWT with `aud` set to the endpoint's origin, `exp` 12 hours, and `sub` from
  `VAPID_SUBJECT` (a `mailto:`). Header `Authorization: vapid t=<jwt>, k=<public key>`. The private
  key is imported as a JWK built from `VAPID_PRIVATE_KEY` (`d`) and the raw public key (`x`, `y`).
- `encrypt.ts`: RFC 8291 `aes128gcm`:
  - an ephemeral ECDH P-256 key pair and the shared secret with the device key (`p256dh`);
  - `IKM = HKDF(auth secret, ecdh secret, "WebPush: info\0" ‖ ua_public ‖ as_public, 32)`;
  - a random 16-byte salt; `CEK = HKDF(salt, IKM, "Content-Encoding: aes128gcm\0", 16)` and
    `nonce = HKDF(salt, IKM, "Content-Encoding: nonce\0", 12)`;
  - one record: plaintext + `0x02` delimiter, record size 4096;
  - body = `salt ‖ rs (4 bytes) ‖ idlen ‖ keyid (as_public, 65 bytes) ‖ ciphertext`.
- `send-web-push.ts`: POST to the endpoint with `TTL`, `Urgency: high`,
  `Content-Encoding: aes128gcm`, the VAPID header, and an optional `Topic` (used by branch 2 for
  replaceable pushes). Returns the response status and `Retry-After`.

## Phase 4: queue, consumer and cron

`apps/api/wrangler.jsonc`, in **all three** blocks (top level for local, `development`,
`production`), because named environments don't inherit (comment at l.79-81):

- producer binding `NOTIFICATIONS_QUEUE` → `qmenut-notifications-local`, `qmenut-notifications-dev`,
  `qmenut-notifications`;
- consumer on the same queue: `max_batch_size` 10, `max_batch_timeout` 1, `max_retries` 5,
  `dead_letter_queue` `<queue>-dlq`.

`apps/api/src/config/env/schema.ts`: the queue binding, plus `VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` as `optionalSecret` (l.73-77).

`apps/api/src/index.ts`: add `queue(batch, env, ctx)` to the `Sentry.withSentry` export. It
dispatches on `batch.queue`: names starting with `qmenut-notifications` go to
`consumePushMessages`. Branch 3 adds the `ming-msg-events-*` consumer next to it.

`consume-push-messages.ts`, per message:

| Situation                                            | Action                                                            |
| ---------------------------------------------------- | ----------------------------------------------------------------- |
| Device or notification gone                          | ack                                                               |
| `each` type already handled, or notification expired | ack without sending                                               |
| Otherwise                                            | build `{ title, body, url, tag }` in the device language and send |
| 201                                                  | ack                                                               |
| 404 or 410                                           | delete the device, ack                                            |
| 429, 5xx or network error                            | `retry({ delaySeconds: Retry-After ?? 30 })`                      |
| Other 4xx (bad VAPID, payload too large)             | report to Sentry, ack                                             |

Messages that exhaust their retries land in the dead-letter queue.

Minute cron (the `scheduled` else-branch, `index.ts:94-98`): run
`Promise.allSettled([publishPendingImages(env), runNotificationMaintenance(env)])`.
`runNotificationMaintenance` deletes expired notifications (recipients cascade) and runs the global
redemption expiry from phase 6, so badges clear even when nobody opens a page. Production's daily
cron is unchanged.

## Phase 5: tRPC

`apps/api/src/modules/notifications/notifications.router.ts`, registered as `admin.notifications`
in `apps/api/src/trpc/router.ts`. Every procedure is a plain `tenantProcedure`: no plan feature and
no permission, since every member who can open the admin gets notifications. Inputs live in
`notifications-input.schema.ts`.

- `list({ branchId })`: the caller's rows where `branch_id = ? OR branch_id IS NULL`, not expired,
  newest first, last 30 days. Returns type, facts, created, read, handled outcome and the handler's
  name (join `users.name`).
- `badge({ branchId })`: unread and not handled, same filter.
- `markRead({ ids })`, `markAllRead({ branchId })`.
- `pushConfig()`: `{ publicKey }`, or null when push is not configured.
- `device({ endpoint })`: the branches this device follows, or null.
- `saveDevice({ endpoint, keys: { p256dh, auth }, branchIds, language })`: `endpoint` must be an
  https URL; at least one branch, and every branch must belong to the restaurant.
- `removeDevice({ endpoint })`: only the caller's own devices.

## Phase 6: first event, reward redemption waiting

- `createRedemption` (`packages/db/src/repositories/loyalty-ledger.repository.ts:105`) takes a
  `branchId`. `apps/api/src/modules/loyalty/request-redemption.ts` passes `tenant.branchId` (the
  host-resolved `ResolvedTenant.branchId`) and then emits `loyalty.redemption` with facts
  `{ rewardName, cost }`.
- The notification is handled:
  - in `validate-redemption.ts` with outcome `validated`, by the member;
  - in `reject-redemption.ts` with `rejected`, by the member;
  - in `cancel-redemption.ts` with `cancelled`, by the guest (`handled_by` null);
  - **inside** `expireStaleRedemptions` (ledger l.24-41) with `expired`: it returns the expired ids
    and marks them, which covers its five lazy callers in one place. Its `restaurantId` becomes
    optional for the cron's global sweep.
- Undoing a validation leaves the notification handled.

## Phase 7: admin

`apps/admin/src/features/notifications/` (one `api.ts`; the page file keeps its row component until
it outgrows the lint budget):

- `api.ts`: query options. The badge refetches every 60 s while the tab is visible (pattern
  `features/loyalty/hooks/use-redemption-queue.ts:21-25`) and is invalidated when the service worker
  posts a message.
- `pages/notifications-page.tsx` and route `app/routes/_auth.notifications.tsx`:
  - rows newest first, unread in bold;
  - handled rows greyed with who handled them: "Validado por Laura", "Caducado",
    "Cancelado por el cliente", "Aceptado automáticamente";
  - clicking a row marks it read and opens its item;
  - "Marcar todo como leído";
  - announcements show their es or en text and their optional link;
  - text is built from type and facts with i18next (`notifications___…` keys in
    `lib/locales/{es,en}/translation.json`), so members with different languages each read it in
    their own.
- `components/notification-bell.tsx` in `.admin-topbar-actions`
  (`app/shell/admin-shell.tsx:151`), rendered always. That block currently renders only with more
  than one membership.
- `components/push-device-control.tsx` and `services/push.ts`, with these states:
  - unsupported browser;
  - iPhone or iPad outside the installed app (reuse the iOS detection in
    `shared/hooks/use-install-prompt.ts`): explain how to add the admin to the home screen;
  - permission denied: explain how to allow it in the browser settings;
  - off: "Activar en este dispositivo" → branch checklist (default: the selected branch from
    `shared/stores/branch-store.ts`) → `Notification.requestPermission()`, only after the tap →
    `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` → `saveDevice` with
    `i18n.language`;
  - on: shows and edits the followed branches; "Desactivar" unsubscribes and calls `removeDevice`.
- Service worker registration goes through a Trusted Types policy `qmenut-service-worker` whose
  `createScriptURL` accepts only `/sw.js` and throws otherwise (pattern `shared/services/qr.ts:49-60`).
  Register with `{ scope: "/", updateViaCache: "none" }`, skipping dev, like
  `apps/web/src/app/register-sw.ts`.
- `apps/admin/public/sw.js`, plain JavaScript:
  - `push`: `showNotification(title, { body, tag, data: { url }, icon })` and `postMessage` to the
    open admin clients;
  - `notificationclick`: close it, focus an admin client and navigate it to the URL, or
    `clients.openWindow(url)`;
  - no fetch handler, no cache, no `importScripts`.
- `apps/admin/public/_headers`: add `qmenut-service-worker` to the `trusted-types` list.

## Phase 8: announcements, made possible

No writing UI in version 1; the Qmenut ops dashboard comes later.

- `publishAnnouncement({ audience: { planCode?, countryCode? }, text: { es: { title, body },
en: { title, body } }, url?, endsAt? })` in the repository:
  - one `INSERT … SELECT` of an `announcement` notification per targeted restaurant: every
    restaurant, those with a branch on the plan (`branches.plan_code`), and/or those in the country
    (`restaurants.country_code`, ISO alpha-3);
  - `branch_id` null (shows on every branch), not actionable, `expires_at` the end date or 30 days;
  - then the recipients, with the same eligibility as any event;
  - never pushed.
- The future ops dashboard calls or replicates this function.

## Phase 9: docs and operations

- New `docs/domains/notifications.md` with the domain-page structure from `docs/README.md`, and its
  row in the README map.
- Fix `docs/apps/web-pwa.md:8` (admin "not installable, no push") and note the service worker in
  `docs/apps/admin.md`.
- `docs/operations/deployment.md`:
  - `wrangler queues create` for each queue and its DLQ, per environment;
  - `wrangler secret put` for `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`;
  - a `bun -e` WebCrypto one-liner that generates the P-256 pair as base64url.

## Verification

- `bun run check`, `bun run lint`, `bun run build`, `bun run test`.
- `bun run test:e2e`: the loyalty redemption specs (`e2e/tests/cross/loyalty-*.spec.ts`) must still
  pass, since phase 6 touches every redemption path.
- Manual, locally with VAPID keys in `apps/api/.dev.vars`:
  1. In Chrome, open the admin (5174), open the notifications page, turn push on for Tapas.
  2. Request a redemption on `tapas.localhost/puntos`: a push arrives, the inbox shows a row and the
     bell a badge.
  3. Validate it: the row turns grey with "Validado por …" and the badge clears.
  4. Let one expire and run the cron with `wrangler dev --test-scheduled` and
     `curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"`: the row shows "Caducado".
  5. On an iPhone, check the install hint outside the app and a push inside the installed admin.
- New tests only if asked (AGENTS.md). If wanted, the most valuable one is the RFC 8291 Appendix A
  test vector for `encrypt.ts`.

## Not in this branch

Everything in the design's "Not in version 1" list, plus the stamp-request and reservation events
(branches 2 and 3).
