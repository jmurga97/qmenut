# Loyalty UX design

This page records the UX decisions for the loyalty program and the reasoning behind them.
The decisions were locked on 2026-07-08 and revised on 2026-07-10 to remove QR scanning.

Customers earn stamps with a rotating venue code: the customer types a four-digit code
that staff read from the admin application, and the stamp is granted automatically with no
approval queue. Staff validate redemptions with one tap on a pending row, during the same
conversation in which the customer asks to redeem. The design uses no cameras, no scanner
screen, and no push infrastructure.

The scope is version 1, in beta. The existing schema in
`packages/db/src/schema/loyalty.ts`, and the loyalty tables in
`apps/api/migrations/0000_baseline.sql`, model everything described here, so no migrations
are needed. The venue code is stateless, derived from the signing secret in the style of
TOTP, so it needs no storage.

## Principles

- Email is the only identity. It is unverified and has no password. `customers.email` is
  the key.
- Presence matters more than approval. Earning requires proof that the device is
  physically in the restaurant at that moment, which the rotating code provides. Nobody
  has to watch a queue.
- Redemption needs no presence mechanism. The payoff is physical, such as a dish or a
  discount at the counter, so redeeming remotely gains nothing.
- Customer onboarding must have close to zero friction. The card persists in
  `localStorage`.
- The program gives the restaurant a useful customer table, not only stamps.

## Version 1 scope

| Decision        | Choice                                                                                                                                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Program mode    | Stamps only (`loyalty_programs.type = 'stamps'`). Points mode is dormant.                                                                                                                                                                         |
| Earn mechanic   | The customer taps "Pedir mi sello", types the venue code that staff read out, and the stamp is granted immediately.                                                                                                                               |
| Redeem mechanic | The customer taps "Canjear", which creates a pending redemption. A member of staff validates it from a list with one tap.                                                                                                                         |
| Venue code      | Four digits, rotating about every three minutes, derived in the style of TOTP from `LOYALTY_TOKEN_SECRET` plus the restaurant, the branch, and the time window. The previous window is accepted to absorb skew. Stateless, with no database rows. |
| Reward types    | `free_dish`, `percentage_discount`, and `special_price`. No gift cards in version 1.                                                                                                                                                              |
| Staff auth      | The existing admin sign-in, backed by `restaurant_users`. The code display and the pending list live in the admin application.                                                                                                                    |
| Anti-abuse      | The venue code proves presence. A stamp rate limit allows a minimum of 4 hours between earned stamps per customer and restaurant, and redemptions expire after 10 minutes.                                                                        |
| Card recovery   | Entering the same email on any device resolves to the same card.                                                                                                                                                                                  |
| QR codes        | Removed entirely. There is no card QR code, no redemption QR code, and no scanner.                                                                                                                                                                |

## Reasoning

The original design had staff scan the customer's QR code, which put a camera-to-screen
scan in the middle of every stamp. An intermediate design had the customer request a stamp
and staff approve it from a queue. That removed the camera but made stamps depend on staff
noticing an asynchronous list. If nobody watches the tablet, the request expires and the
customer's first experience of the program is a request that never resolves.

The venue code makes earning synchronous and customer-initiated. Nothing happens until the
customer asks, and the answer is always available: staff glance at the code and read four
digits out loud. The effort is comparable to stamping a paper card.

The code is also the strongest presence proof available without a camera. It is readable
only inside the restaurant and is worthless minutes later. The alternatives are weaker:
GPS can be spoofed and is inaccurate indoors, table-QR URLs can be shared, and Wi-Fi or IP
checks break on mobile data. Location is never sent to the server and is never trusted by
it.

Redemptions need none of this. A customer redeems while talking to a member of staff, so a
person with the admin application on their phone is already involved. Validation is one
tap on a row that appeared seconds earlier.

## Customer flow

### Entry point

When the restaurant's loyalty program is active, the public menu shows a persistent
floating card button with a stamp icon. For a known customer it shows progress, such as
`3/8`. For an unknown visitor it shows a short prompt, such as "Consigue premios".

### Onboarding

Onboarding has two steps:

1. The customer taps the card button, which opens a sheet with the reward pitch, such as
   "Cada visita, un sello. 8 sellos = café gratis", and a single email input.
2. The customer submits the form. The card is created immediately: `customers` is upserted
   by email and a `customer_restaurants` row is created. The card token is stored in
   `localStorage`, and the stamp grid appears.

There is no verification, no name, and no password. The `name` and `birthdate` columns stay
empty in version 1.

### The card screen

- A stamp grid sized to the cheapest reward's cost, for example 8 slots, with filled stamps
  visible.
- A primary button labeled "Pedir mi sello".
- A rewards list below, showing each reward with its stamp cost. Unlocked rewards are
  highlighted and have a "Canjear" button.
- The card is per restaurant, because balances live in `customer_restaurants`, and it is
  shared across branches.

### Returning visits

On the same device, the card button already shows progress. On a new device, or after
storage is cleared, the customer taps the button and enters their email, which restores
the same card and balance. The trade-off is accepted: anyone who knows the email address
can see the card, but earning still requires the venue code, which limits abuse.

### Earning a stamp

1. The customer asks staff for a stamp, and staff read the code from the admin
   application, for example "4-8-3-2".
2. The customer taps "Pedir mi sello", which shows a four-digit input with the hint
   "Pídele el código al personal".
3. A correct code grants the stamp immediately: an earn transaction is written, the
   balance increases by one, a `customer_visits` row is logged, and a success animation
   plays while the customer is still at the counter.
4. An incorrect code produces an inline error and can be retried. A small attempt throttle
   per card, for example five tries per minute, prevents brute-forcing the 10,000
   combinations.
5. If a stamp was already earned in the last 4 hours, the customer sees a message such as
   "Ya tienes el sello de esta visita".

### Redeeming a reward

1. When the customer is ready to redeem, usually while talking to staff, they tap
   "Canjear" on an unlocked reward and confirm. This creates a `loyalty_redemptions` row
   with `status='pending'`. The card shows "Esperando confirmación del personal…" and polls
   for the status.
2. A member of staff opens the Fidelidad page in the admin application, sees the pending
   row with its age, and taps "Validar". The customer's screen changes to a success screen
   that shows the reward name prominently, and the stamp grid decrements.
3. Pending redemptions expire after 10 minutes and move to `status='expired'`, so an
   accidental tap does not lock anything. The customer can also cancel. Stamps are
   unaffected in both cases, because the deduction happens only at validation.

## Admin flow

### Program setup

The owner configures the program once on the Fidelización page:

1. Turn the program on, which creates a `loyalty_programs` row with `type='stamps'` and
   `stamps_per_visit=1`.
2. Create rewards. For a free dish, pick a dish from the existing menu. For a percentage
   discount, enter a percentage. For a special price, pick a dish and enter a price. Each
   reward has a stamp `cost`.
3. Enter the ticket medio, the average spend per visit in euros. This is a single optional
   field that the owner fills in once, and it powers the loyalty-return estimate in
   insights. It is stored in `loyalty_programs.rules_json`, so no migration is needed. If
   it is empty, the return chart shows a prompt to set it instead of numbers.
4. Review the preview of the customer card.

### The Fidelidad page

This is one mobile-first page in the admin application with two elements:

1. The venue code, shown large enough to read across a counter, for example `4 8 3 2`, with
   a countdown ring to the next rotation about every three minutes. Staff read it out when
   a customer asks for a stamp; there is nothing to tap. The code is per branch, based on
   the staff device's active branch, so a granted stamp is attributed to a branch
   automatically. The server matches the submitted code against the restaurant's branches
   to attribute the visit.
2. The pending redemptions list. Each row shows the email address, the reward name, the
   stamp cost, and the age of the request, with "Validar" and "Rechazar" actions. Stale
   rows disappear through lazy expiry. Races are safe: if two devices validate the same
   row, the second receives a conflict and the list refreshes.

Both granting and validation show a success toast with an undo action, implemented as a
compensating `adjust` transaction, which makes the undo idempotent. An optional later
addition is printing a hint about asking for the code on table QR stands, so customers know
the program exists.

### Insights

The Fidelización section has an insights view. Everything in it is derived from existing
tables:

- Health numbers, shown as cards at the top: active cards, stamps given this month,
  redemptions this month, redemption rate, and repeat-visit rate.
- A customer table with the email address, stamp balance, total visits, first visit, last
  visit, and rewards redeemed. It is sortable and searchable, and it can be exported as
  CSV.
- An inactive filter on that table, showing customers whose last visit was more than N days
  ago, with a default of 30. This is the hook for future campaigns.
- A visits chart showing loyalty visits per day or week, split into new and returning
  visitors, derived from `customer_visits` and `customer_restaurants.first_visit_at`.
- A loyalty return chart, "Retorno de fidelización", showing estimated revenue driven by
  the program against the cost of redeemed rewards, per month, with a headline ratio such
  as "Por cada 1 € en premios, tus clientes fieles gastaron ~12 €".

The loyalty return chart is an estimate and is labeled as such in the UI. It is computed as
follows:

- For each validated redemption, the estimated revenue is the stamp cost of the reward,
  which approximates the number of visits driven, multiplied by the ticket medio. Where the
  customer's real visit count since their previous redemption is available, use that
  instead, because it is exact.
- Reward cost depends on the type. For `free_dish`, it is the current menu price of the
  dish, which is the most accurate. For `special_price`, it is the menu price minus the
  special price. For `percentage_discount`, it is the percentage multiplied by the ticket
  medio, which is the least accurate because it depends on the estimate twice.
- The chart requires the owner-provided ticket medio. Without it, the chart shows an empty
  state that prompts for the value.

The UI carries a footnote stating that the chart measures correlation, not causation. Some
of those visits would have happened without the program. Exact measurement needs
per-ticket amounts from a POS or orders integration, which is out of scope for version 1.

## Security

- Card token. A signed HMAC token that contains `customer_id` and `restaurant_id`, stored
  in `localStorage`. It is how the customer's device authenticates as the owner of the
  card. It is long-lived, which is safe because earning requires the venue code and
  redeeming requires staff validation.
- Venue code.
  `HMAC(LOYALTY_TOKEN_SECRET, restaurantId + branchId + floor(now / window))`, truncated
  to four digits, with a window of about three minutes and the previous window accepted.
  Verification is a pure computation with no storage and no synchronization. Brute force is
  bounded by the per-card attempt throttle and the 4-hour rate limit, and a successful
  guess yields exactly one stamp.
- Abuse ceiling. Someone physically present who did not consume anything, such as a friend
  at the table who overhears the code, can earn one stamp per 4 hours per email address.
  That is close to the intended behavior of one stamp per visit per person. Remote
  attackers cannot read the code, and expired codes are worthless.
- All admin endpoints, including the code display, validation, rejection, undo, and
  insights, require an authenticated `restaurant_users` session scoped to the restaurant.

## Backend impact

Relative to the implemented QR version, the ledger (earn, redeem, and undo), lazy expiry,
program and reward CRUD, insights, and the redemption request, cancel, and status surface
are unchanged. The differences are:

- Added: a venue-code helper that generates and verifies the code in the style of TOTP, in
  about 30 lines, reusing `LOYALTY_TOKEN_SECRET`; the public
  `loyalty.earnStamp({ cardToken, venueCode })`, which verifies the code and the rate limit
  and then runs the existing earn write; and the tenant procedures
  `admin.loyalty.venueCode({ branchId })`, `admin.loyalty.pendingRedemptions`, and
  `admin.loyalty.rejectRedemption`.
- Added: the 4-hour earn rate-limit check and the per-card code-attempt throttle.
- Added: `ticketMedio` persisted in `loyalty_programs.rules_json`, whose column already
  exists, and an `admin.loyalty.insights.loyaltyReturn` query that joins validated
  redemptions with reward types, dish prices, and visit counts.
- Removed: `admin.loyalty.resolveScan` and `admin.loyalty.addStamp`, because earning is no
  longer staff-initiated, and the QR token types for card and redemption payloads. The
  card-token HMAC signing remains.
- No new tables and no migration.

## Out of scope

The following are deferred:

- Wallet passes in version 2: an "Add to Apple Wallet" or "Add to Google Wallet" button on
  the card screen, which would add persistence, lock-screen geofence surfacing, and a
  push-updated balance. It is a pure add-on, and the pass would carry the same card-token
  URL. It requires an Apple Developer certificate and a Google Wallet issuer account, which
  is not worth it for the beta.
- Points-per-euro mode, which requires entering the ticket amount, and per-reward variable
  economics.
- Exact loyalty ROI from per-ticket amounts through a POS or orders integration, which
  would turn the loyalty return chart from an estimate into a measurement.
- Gift cards and stored value.
- A staff PIN mode that displays the code without a full admin account.
- Configurable rate-limit and rotation windows, and fraud flags.
- Campaigns targeting inactive customers, for which the schema already exists.
