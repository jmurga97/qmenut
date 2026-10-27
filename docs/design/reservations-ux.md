# Reservations UX design

This page records the decisions for reservations version 1, settled on 2026-10-23. Terms
follow the _Reservations_ section of [CONTEXT.md](../../CONTEXT.md). Related decisions:
[ADR 0003](../adr/0003-whatsapp-through-ming-msg-worker.md),
[ADR 0004](../adr/0004-reservation-access-by-email-alone.md) and
[ADR 0005](../adr/0005-unanswered-reservations-are-accepted.md).

## Principles

- Simplicity and UX come first, for the guest and for staff.
- Every branch is independent: its own slots, capacity, settings and reservation list.
- Staff keep control, but their silence never leaves a guest without an answer.
- Business plan only (`reservations` plan feature, following each branch's plan), off by
  default until the restaurant turns it on.

## Guest flow (`/reservar`)

1. **Date and slot.** A themeable Lit calendar shows each day as _available_ (a slot has a
   free table), _full_ (every slot full) or _unavailable_ (no slots that weekday, a slot
   closure, or outside the reservation window). Picking a day shows its reservation slots
   as buttons; full slots are disabled.
2. **Party size.** Up to the online party limit; above it, "For larger groups, call us"
   with the branch phone.
3. **Contact.** Name, phone (E.164, country defaulting to the restaurant's) and email, all
   required.
4. **Review.** A summary, a required checkbox agreeing to receive messages about this
   reservation by WhatsApp and email (linked to `/privacidad`), and _Send request_.

Afterwards the same route shows the guest's reservations at that branch: the email is
remembered in `localStorage`, and on another device anyone can type the email to see them.
The guest can cancel until the slot starts.

The tab appears only when the plan includes reservations, the restaurant turned them on,
and at least one slot exists. Otherwise `/reservar` shows an unavailable state with
`noindex,nofollow`, like the rewards tab. Times are in the restaurant's timezone.

## Lifecycle

- **Pending**: holds a table. Staff accept or decline it within the response time, or it
  is accepted automatically.
- **Accepted**: holds a table. The attendance check is sent 2 h before the slot (right
  away if accepted later than that; skipped if accepted after the deadline).
- **Confirmed**: the guest tapped _Confirm_ in WhatsApp.
- **Unconfirmed**: no answer by the deadline (45 min before). Still holds the table;
  highlighted for staff, who may cancel it.
- **Declined / Cancelled**: frees the table. Guests cancel from `/reservar` or the
  WhatsApp _Cancel_ button; staff cancel from admin.

Slot capacity counts pending, accepted, confirmed and unconfirmed reservations; one
reservation is one table, whatever the party size.

## Messages

| Event                                | Channel                    | To                                        |
| ------------------------------------ | -------------------------- | ----------------------------------------- |
| Request received                     | Email                      | Guest                                     |
| New request                          | Email                      | Owners (never support accounts)           |
| Accepted (by staff or automatically) | Email                      | Guest                                     |
| Declined                             | Email, with branch phone   | Guest                                     |
| Cancelled (by anyone)                | Email                      | Guest; owners too if it had been accepted |
| Attendance check                     | WhatsApp, Confirm / Cancel | Guest                                     |

Emails use the guest's site language. The attendance check uses the `es` or `en`
template, falling back to `es`.

## Admin

A _Reservations_ section (permission `reservations.manage` for owner, admin and staff) with
a pending-count badge in the nav:

- **Today**: pick a day; reservations grouped by slot, pending and unconfirmed first, each
  row expanding to the contact details; Accept, Decline and Cancel. Refreshes about every
  minute while open.
- **Settings**: on/off, reservation slots per weekday (with "copy to all days"), slot
  capacity, online party limit, reservation window, lead time, response time and
  attendance check timing.
- **Closures**: close a date or a single slot.

Defaults: lead time 2 h, window 30 days ahead, response time 12 h, attendance check sent
2 h before with a 45 min deadline, online party limit 8. The restaurant sets its slots and
slot capacity.

## Data protection

Contacting the guest about their own reservation needs no marketing consent; the review
step's checkbox covers Meta's WhatsApp opt-in. Guest contact data is anonymized 90 days
after the slot.

## Not in version 1

- Table maps and meal durations (capacity is counted per slot).
- Entering phone bookings by hand (staff use slot closures).
- Loyalty links, points or stamps for attending.
- A free-text WhatsApp agent.
- A "few left" calendar state.
- Push and in-admin notifications: designed separately as a generic staff notifications
  feature, with new reservation requests as its first event.
