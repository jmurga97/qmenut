# Unanswered reservations are accepted automatically

Superseded by [ADR 0008](0008-reservations-are-booked-and-confirmed-by-email.md): reservations
are booked at once and staff no longer answer them.

Staff accept or decline each reservation, but a reservation nobody answers within the
branch's response time (12 hours by default, never past the lead time before the slot) is
accepted automatically. A reservation can only be requested while its slot has a free table,
so staff silence cannot overbook, and the guest always gets an answer. The restaurant keeps
control by declining within the response time or cancelling afterwards, and the attendance
check still runs.

## Considered Options

- **Expire at the lead time**: rejected; the guest could wait days for a refusal and learn
  it two hours before dinner.
- **Expire after the response time**: rejected; it turns guests away only because staff
  were busy, while a table was free.
