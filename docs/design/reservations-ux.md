# Reservations UX design

This page records the decisions for reservations version 1, settled on 2026-10-23 and simplified
on 2026-10-31 when WhatsApp became unavailable. Terms follow the _Reservations_ section of
[CONTEXT.md](../../CONTEXT.md). Related decisions:
[ADR 0004](../adr/0004-reservation-access-by-email-alone.md) and
[ADR 0008](../adr/0008-reservations-are-booked-and-confirmed-by-email.md).

## Principles

- Simplicity and UX come first, for the guest and for staff.
- Optimistic: a booked guest is expected. Confirming is information for staff, never a condition.
- Every branch is independent: its own slots, capacity, settings and reservation list.
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
4. **Review.** A summary, a required checkbox agreeing to receive emails about this
   reservation (linked to `/privacidad`), and _Book_. The reservation is made at once.

Afterwards the same route shows the guest's reservations at that branch: the email is
remembered in `localStorage`, and on another device anyone can type the email to see them.
The manage link in the emails (`/reservar?reserva=<id>`) opens the same list on any device.
Each upcoming reservation can be confirmed (while pending) or cancelled until its slot starts.
Opening the link never confirms by itself, because email scanners open links.

The tab appears only when the plan includes reservations, the restaurant turned them on,
and at least one slot exists. Otherwise `/reservar` shows an unavailable booking state with
`noindex,nofollow`; lookup, confirmation and cancellation of existing reservations stay
available, including following a plan downgrade. Times are in the restaurant's timezone.

## Lifecycle

- **Pending** (shown as _not confirmed_): booked, holds a table, the guest is expected.
- **Confirmed**: the guest tapped _Confirm_; holds a table.
- **Cancelled**: frees the table. Guests cancel from `/reservar`; staff cancel from admin.

Nothing happens on its own to a pending reservation. Slot capacity counts pending and confirmed
reservations; one reservation counts as one, whatever the party size.

## Slot capacity without table sync

Restaurants assign tables on the night, so the online book is not a floor plan. Slot capacity is
a pacing cap, the way other reservation products limit bookings per interval: the restaurant sets
it below its real tables, walk-ins and phone bookings fill the rest, and staff close a slot when
the room fills up. There is nothing else to keep in sync.

## Messages

| Event                        | Guest email | Staff notification (inbox and push) |
| ---------------------------- | ----------- | ----------------------------------- |
| Booked                       | Booked      | New reservation                     |
| Reminder time, still pending | Reminder    | —                                   |
| Guest confirms               | —           | —                                   |
| Guest cancels                | Cancelled   | Reservation cancelled               |
| Staff cancel                 | Cancelled   | —                                   |

Every guest email carries the manage link and uses the guest's site language. A reservation
booked after its reminder time gets no reminder: its booking email is minutes old. Owners get no
reservation emails; neither notification asks staff for an answer. Every cancellation emails the
guest, so a cancellation by someone who knew the email does not go unnoticed (ADR 0004).

## Admin

A _Reservations_ section (permission `reservations.manage` for owner, admin and staff):

- **Day**: pick a day; reservations grouped by slot with how many are held and how many people,
  not-confirmed ones first, each row expanding to the contact details; Cancel, which emails the
  guest. Refreshes about every minute while open.
- **Settings**: on/off, reservation slots per weekday (with "copy to all days"), online
  reservations per slot, online party limit, reservation window, lead time and reminder time.
- **Closures**: close a date or a single slot.

Defaults: lead time 2 h, window 30 days ahead, reminder 24 h before, online party limit 8. The
restaurant sets its slots and slot capacity.

## Data protection

Contacting the guest about their own reservation needs no marketing consent. Guest contact data
is anonymized 90 days after the slot.

## Not in version 1

- Table maps and meal durations (capacity is counted per slot).
- Entering phone bookings by hand (staff use slot closures).
- Loyalty links, points or stamps for attending.
- WhatsApp messages, until the Meta account is available (ADR 0003).
- Marking arrivals or no-shows.
- A "few left" calendar state.
