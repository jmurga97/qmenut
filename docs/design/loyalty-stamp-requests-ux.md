# Loyalty stamp requests UX design

This page records how guests earn stamps with stamp requests. It was settled on 2026-10-28
and replaces the earn mechanic in [loyalty-ux.md](loyalty-ux.md). Everything else there
(onboarding, the card, rewards, redemptions, insights, security) still holds. Terms follow the
_Loyalty_ section of [CONTEXT.md](../../CONTEXT.md). Related decisions:
[ADR 0007](../adr/0007-unanswered-stamp-requests-are-accepted.md); delivery to staff follows
[notifications-ux.md](notifications-ux.md).

## Why it changed

The July design granted one stamp per venue code at once, so a guest who bought two coffees
got one stamp and the restaurant could neither grant more nor check the claim. Now the guest
claims a number of stamps and staff accept it, possibly later. The venue code stays the
presence proof; staff approval is the quantity check.

## Principles

- The guest sees their stamps at once, as pending stamps.
- Staff decide the quantity, but their silence never leaves a guest without an answer.
- Pending stamps cannot be spent.
- Redemption is unchanged.

## Guest flow

1. **Ask.** "Pedir mi sello" becomes **"Pedir sellos"**. The sheet asks "¿Cuántos?" with a
   stepper from 1 to the stamp request limit, starting at 1, then the four-digit venue code
   staff read out.
2. **Pending.** On a correct code the request is created and the card shows the new stamps
   as outlined slots marked "3 pendientes", with **Cancelar** while the request is pending.
   Rewards unlock only on accepted stamps.
3. **Answer.** The card refreshes when opened or when the page regains focus; no polling and
   no email, since answers can take hours. After staff act, the next open shows a one-time
   notice: the stamps fill in, "Confirmaron 2 de 3 sellos", or "Tu solicitud no fue
   aceptada".

Rules:

- One stamp request every 4 hours per card, counted from the previous request whatever its
  outcome. A request the guest cancelled does not count, so a wrong quantity can be fixed by
  cancelling and asking again.
- The per-card throttle of five code attempts per minute is unchanged.
- A guest who is still within the 4 hours sees "Ya pediste sellos en esta visita".

## Lifecycle

- **Pending**: shows on the card as pending stamps. Staff accept, lower or decline it, or the
  guest cancels it.
- **Accepted**: by staff, at the claimed quantity or fewer, or automatically after 12 hours
  unanswered at the claimed quantity. The stamps are added to the balance and one visit is
  logged, dated at the request time.
- **Declined**: the pending stamps disappear. No visit, no other consequence for the guest.
- **Cancelled**: by the guest while pending. Does not count toward the 4 hours.

Requests still pending when the owner turns the program off are still accepted after 12
hours: the guest earned them while it was on.

## Admin

The Fidelidad page (permission `loyalty.operate`: owner, admin and staff) gains a
**"Solicitudes de sellos"** list between the venue code and the pending redemptions, for the
device's active branch, the same scoping as the venue code:

- Each row: guest email, claimed quantity with a stepper that can only go down, request time
  ("hace 2 h · 18:42") to match against the till, and "Se acepta sola en 10 h". Actions:
  **Aceptar** and **Rechazar**.
- Accepting or declining shows a toast with **Deshacer**, as today.
- Below, a collapsed **"Últimas 24 h"** list of handled requests ("Aceptada", "Aceptada sola",
  "Aceptada 2 de 3", "Rechazada") with **Deshacer** on accepted ones. Undo is a compensating
  `adjust` and is refused when the balance would go negative because the stamps were spent.
- No "accept all": doing nothing already accepts.
- Two devices answering the same request: the second gets a conflict and the list refreshes,
  as with redemptions.

Program setup gains one field, **"Máximo de sellos por solicitud"**: default 3, range 1–10.

## Notifications

Each stamp request is one notification event for the branch it was made at. It is handled
for every member when it is accepted (by staff, fewer, or automatically), declined, or
cancelled by the guest. The push is the shared per-branch one with a count; the inbox keeps a
row per request.

## Insights

Pending stamps are excluded from every number. "Sellos este mes" counts accepted stamps at the
accepted quantity, dated at the request time, so a request on the 31st accepted on the 1st
counts in the earlier month. Visits come only from accepted requests. Redemption rate, the
customer table, the visits chart and the loyalty return chart are otherwise unchanged. No new
metric in version 1.

## Backend impact

Relative to the implemented venue-code version:

- Added: a `loyalty_stamp_requests` table (customer, restaurant, branch, claimed and accepted
  quantity, status, who handled it and when, created at) and its migration; the stamp request
  limit in `loyalty_programs.rules_json`.
- Changed: `loyalty.earnStamp` becomes a create-request mutation taking a quantity; the 4-hour
  check reads requests instead of earn transactions; the earn write (transaction, balance,
  `customer_visits`) moves to acceptance, with the visit dated at the request time.
- Added: guest `cancelStampRequest`; the card query returns pending stamps and the last
  unseen outcome; tenant `pendingStampRequests`, `acceptStampRequest({ quantity })`,
  `declineStampRequest` and the 24-hour handled list; undo reuses `compensateTransaction`.
- Added: auto-acceptance in the existing every-minute cron, which also marks the notification
  handled. Reads accept overdue requests lazily too, like redemption expiry.
- `stamps_per_visit` stays at 1 and is no longer read.

## Not in version 1

- Staff granting stamps without a request.
- A configurable 12-hour window or cooldown.
- Notifying the guest by email or push when staff answer.
- Fraud flags, such as a card that is often declined.
