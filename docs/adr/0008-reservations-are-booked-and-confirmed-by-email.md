# Reservations are booked at once and confirmed by email link

A guest's reservation is booked the moment they send it, as long as the slot has room; staff no
longer accept or decline it. It stays _pending_ (not confirmed) and holds its table until the guest
or staff cancel it. The guest gets a booking email and, 24 hours before the slot by default, a
reminder. Both carry a manage link to `/reservar?reserva=<id>`, where one tap confirms or cancels.
Nothing happens to a reservation the guest never confirms: staff see it as not confirmed and decide
whether to call or give the table away. Owners get no emails; staff get an inbox row and a push for
each new booking and each guest cancellation, and neither asks for an answer.

WhatsApp was meant to carry the attendance check (ADR 0003), but the Meta account is not available.
Email alone is enough for the optimistic flow: other reservation products book instantly and send a
reminder with a confirm or cancel link, and across 3.77 million resos reservations a delivered
reminder went with 16% fewer no-shows while a confirmation prompt made almost no difference. The
reminder and its easy cancel are what matter; _confirmed_ is information for staff.

The reservation id (a random UUID) is the link's only secret. It opens the guest's reservations as
their email already does (ADR 0004), so it adds no access the email didn't give. The link opens a
page and never changes the reservation itself: email security scanners open every link, and a
confirming GET would mark most corporate inboxes confirmed.

Supersedes ADR 0005 (staff answer reservations; unanswered ones are accepted), now deleted.

## Considered Options

- **Keep staff accept and decline**: rejected; a guest can only book a slot with a free table, so
  the step guarded almost nothing, and it cost two emails, an actionable notification, a response
  time and an automatic-acceptance job.
- **Cancel reservations nobody confirms**: rejected; most guests who don't answer still come, and
  restaurants assign tables on the night anyway.
- **A link that confirms on click**: rejected for the email scanners above.
- **A signed token in the link**: rejected; it needs a secret and a column, and the id is already
  unguessable and no stronger than the email.
