# Staff notifications UX design

This page records the decisions for staff notifications version 1, settled on 2026-10-28.
Terms follow the _Notifications_ section of [CONTEXT.md](../../CONTEXT.md). Related decision:
[ADR 0006](../adr/0006-notifications-through-cloudflare-queues.md). Reservations
([reservations-ux.md](reservations-ux.md)) is the first feature to emit notifications; the
stamp request flow is being designed separately for loyalty.

## Principles

- One generic feature: other features emit events, and this one decides who sees them and how.
- Push is for things that need action. If a phone buzzes, there is something to do.
- Every plan has it, with no plan feature key. Events exist only where their feature exists.
- Email is not a channel of this feature. Each feature keeps its own emails (for example
  the reservation emails to guests).

## Events

| Event                          | Actionable: handled when | Push                       |
| ------------------------------ | ------------------------ | -------------------------- |
| New reservation                | No                       | One per reservation        |
| Reservation cancelled by guest | No                       | One per cancellation       |
| Reward redemption waiting      | Validated or expired     | One per redemption         |
| Stamp request                  | Accepted or declined     | One per branch, with count |
| Announcement                   | No                       | Never                      |

Reservation pushes are the exception to "push needs action" ([ADR 0008](../adr/0008-reservations-are-booked-and-confirmed-by-email.md)):
nothing waits for staff, but a booking or a freed table for tonight changes the plan for service.

Stamp requests share one replaceable push per branch ("3 stamp requests waiting · Tapas
Centro"), so a busy café does not buzz eighty times a day. The inbox still shows each request
on its own row.

## Recipients

- A restaurant event goes to every active member who can open the admin right now. On the
  Basic plan, that is the owner only. When a restaurant upgrades, the other members receive
  notifications from that moment, and nothing is sent for the past.
- Qmenut support accounts never receive restaurant notifications.
- Push goes only to the member's push devices that follow the event's branch.

## Inbox (admin)

A bell in the admin header shows a badge: the member's notifications that are unread and not
handled. The bell opens the _Notifications_ page:

- The last 30 days, newest first, filtered to the selected branch. Announcements show on every
  branch.
- Each row opens its item, such as the reservation or the stamp request.
- Read and unread are per member. Handled is shared: when anyone acts, the row drops out of
  every badge and shows greyed out with who handled it ("Accepted by Laura", "Accepted
  automatically").
- Text is rendered in the admin's language (`es` or `en`) from the event and its facts, so
  members with different languages read the same notification in their own.

Notifications are deleted after 30 days. An announcement with an end date disappears when
that date passes.

## Push devices

- The inbox page and the user menu have a _Notifications on this device_ control. The
  browser asks for permission only after the member taps it, never on its own.
- When turning push on, the member chooses which branches the device follows. The default is
  the branch currently selected. The bar tablet follows its branch, and the owner's phone
  can follow all of them. Turning it off, or changing the branches, affects only that device.
- On an iPhone or iPad, web push works only when the admin is installed to the home screen
  (iOS 16.4 and later). Outside the installed app, the control explains how to add it to the
  home screen instead.
- A push shows the event, the branch and the facts needed to act, with no guest personal
  data. For example: "New reservation · Tapas Centro · Fri 21:00 · 4 people".
  Tapping it opens the item in the admin, and the guest's details show there after sign-in.
- A push uses the admin language the device had when push was turned on.
- There are no other preferences in version 1.

## Announcements

Written by Qmenut, never by restaurants. Each one has `es` and `en` text, an optional link,
an optional end date, and an audience: every restaurant, or restaurants on one plan (for
example Basic, for an upgrade offer) and/or in one country. Within each targeted restaurant,
it reaches every member who can open the admin. Announcements appear in the inbox only and
are never pushed. Where they are written is decided later. It will be a Qmenut ops
dashboard outside the admin, so version 1 only makes announcements possible.

## Architecture

- **Inbox**: a D1 table in `qmenut-api`, read by the notifications page. Read state is
  per member; handled state is shared by the restaurant.
- **Delivery**: emitting an event writes the inbox rows and enqueues the pushes on a
  Cloudflare Queue consumed by `qmenut-api`, with retries and a dead-letter queue
  ([ADR 0006](../adr/0006-notifications-through-cloudflare-queues.md)).
- **Web Push**: a VAPID key pair stored as Worker secrets. Payloads are encrypted per RFC
  8291 with WebCrypto inside the Worker. Each push device is stored per member and device,
  with its followed branches and language. A device whose push address returns 404 or 410 is
  deleted.
- **Service worker**: a plain `sw.js` file at the admin root. It only handles push events
  and notification clicks: no offline cache and no `importScripts`. Under the admin's
  Trusted Types CSP, it is registered through a named policy `qmenut-service-worker` that
  accepts only `/sw.js`, added to the `trusted-types` list in `apps/admin/public/_headers`.

## Not in version 1

- Email as a notification channel.
- Push on/off switches per event type, or any per-member preferences beyond each device.
- A tool for writing announcements: the Qmenut ops dashboard comes later.
- Memberships limited to some branches. Push devices choose the branches they follow
  instead.
- Offline support or caching in the service worker.
