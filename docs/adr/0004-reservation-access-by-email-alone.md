# A guest's email alone opens their reservations

Anyone who enters the email used for a reservation can see it and cancel it from the public
reservation screen, with no code or link proving they own that inbox. This lets everyone in
the party look up the dinner by typing the organiser's email, and mirrors the remembered-email
pattern guests already know from the rewards tab. We accept that someone who knows a
guest's email can read or cancel that guest's reservation; every cancellation emails the
reservation's address, so the real guest finds out.

## Considered Options

- **A one-time code sent to the email**: safer, rejected as extra friction for a dinner
  booking.
- **A private link only (localStorage token or the link in the acceptance email)**: rejected
  because other attendees could not look the reservation up themselves.
