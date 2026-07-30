# Loyalty — UX Design

Decisions locked 2026-07-08; **revised 2026-07-10: QR scanning removed.**
Stamps are earned with a **rotating venue code** (customer types a 4-digit code
that staff reads off the admin app — auto-grant, no approval queue).
Redemptions are validated by staff with **one tap on a pending row**, during
the same conversation in which the customer asks to redeem. No cameras, no
scanner screen, no push infrastructure.

Scope: v1 / beta. The existing schema
(`apps/api/migrations/0001_initial_schema.sql`, sections 6–7) models everything
below — **no migrations needed**. The venue code is stateless (TOTP-style,
derived from the signing secret), so it needs no storage at all.

## Principles

- Email is the only identity. Unverified, no password. `customers.email` is the key.
- **Presence over approval.** Earning requires proof the device is physically in
  the restaurant _right now_ (the rotating code). Nobody has to watch a queue.
- Redemption needs no presence mechanism: the payoff is physical (a dish, a
  discount at the counter), so redeeming remotely gains nothing.
- Client onboarding must be near-zero friction; card persists in `localStorage`.
- The program gives the restaurant a useful customer table, not just stamps.

## v1 scope

| Decision        | Choice                                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Program mode    | **Stamps only** (`loyalty_programs.type = 'stamps'`; points mode dormant)                                                                                          |
| Earn mechanic   | Client taps **"Pedir mi sello"** → types the **venue code** staff reads out → stamp auto-grants instantly                                                          |
| Redeem mechanic | Client taps **Canjear** → pending redemption → waiter validates from a list, one tap                                                                               |
| Venue code      | 4 digits, rotates every ~3 min, TOTP-style from `LOYALTY_TOKEN_SECRET` (+ restaurant + branch + time window); previous window accepted for skew. Stateless — no DB |
| Reward types    | free_dish, percentage_discount, special_price (no gift cards in v1)                                                                                                |
| Staff auth      | Existing admin login (`restaurant_users`); code display + pending list live in the admin app                                                                       |
| Anti-abuse      | Venue code (presence) + **stamp rate limit: min 4 h between earned stamps** per customer per restaurant + 10 min redemption TTL                                    |
| Card recovery   | Re-entering the same email on any device resolves to the same card                                                                                                 |
| QR codes        | **Removed entirely** — no card QR, no redemption QR, no scanner                                                                                                    |

## Why this shape

The original design (staff scans the customer's QR) put a camera-to-screen scan
in the middle of every stamp. The intermediate idea (customer requests, staff
approves from a queue) removed the camera but made stamps depend on staff
_noticing_ an async list — if nobody watches the tablet, the request expires
and the customer's first impression of the program is a spinner that dies.

The venue code makes earning **pull-based and synchronous**: nothing happens
until the customer asks, and the answer is always available — staff glances at
the code and says four digits out loud. Same effort as stamping a paper card.
It is also the strongest cameraless presence proof: the code is only readable
inside the restaurant and is worthless minutes later. (GPS is spoofable and
inaccurate indoors; table-QR URLs are shareable; Wi-Fi/IP checks break on
mobile data — none of those are presence proofs. Location is never sent to or
trusted by the server.)

Redemptions don't need any of this: a customer redeems _while talking to the
waiter_ ("quiero canjear mi postre"), so a human with the admin app on their
phone is already in the loop — validation is one tap on a row that appeared
seconds ago.

## Client flow

### Entry point

When the restaurant's loyalty program is active, the public menu shows a
**persistent floating card button** (stamp icon). For a known customer it shows
progress (`3/8`); for an unknown visitor it shows a subtle hook ("☕ Consigue premios").

### Onboarding (first time) — 2 steps

1. Tap the card button → sheet: reward pitch ("Cada visita, un sello. 8 sellos = café gratis")
   - a single **email input**.
2. Submit → card created instantly (`customers` upsert by email +
   `customer_restaurants` row). Card token stored in `localStorage`. Done — the
   card (stamp grid) is on screen.

No verification, no name, no password. `name`/`birthdate` columns stay empty in v1.

### The card screen

- **Stamp grid** sized to the cheapest reward's cost (e.g. 8 slots), filled stamps visible.
- Primary button: **"Pedir mi sello"** (see Earning below).
- **Rewards list** below: each reward with its stamp cost; unlocked ones highlighted
  with a "Canjear" button.
- Card is per restaurant (balances live in `customer_restaurants`), shared across branches.

### Returning visits

- Same device: card button already shows progress.
- New device / cleared storage: tap button → enter email → same card and balance
  come back. (Accepted trade-off: anyone knowing the email sees the card; earning
  still requires the venue code, limiting abuse.)

### Earning a stamp

1. Customer asks staff ("¿me pones un sello?"); staff reads the code off the
   admin app: "4-8-3-2".
2. Customer taps **"Pedir mi sello"** → a 4-digit input appears
   ("Pídele el código al personal").
3. Correct code → stamp grants **instantly**: earn transaction, balance +1,
   `customer_visits` logged, success animation on the customer's screen while
   they're still at the counter.
4. Wrong code → inline error, can retry (small attempt throttle per card,
   e.g. 5 tries/min, to prevent brute-forcing the 10 000 combinations).
5. If a stamp was already earned in the last 4 h → friendly block:
   "Ya tienes el sello de esta visita".

### Redeeming

1. When ready to redeem (talking to the waiter), tap **Canjear** on an unlocked
   reward → confirm → creates `loyalty_redemptions` row (`status='pending'`);
   the card shows "Esperando confirmación del personal…" and polls status.
2. Waiter opens the admin app's Fidelidad page, sees the pending row
   ("hace 5 s"), taps **Validar** → client screen flips to a **success screen**
   with the reward name big and bold; stamp grid decrements.
3. Pending redemptions expire (10 min → `status='expired'`) so an accidental
   tap doesn't lock anything; client can also cancel. Stamps are untouched
   either way (deduction happens only at validation).

## Admin flow

### Program setup (owner, once)

Admin → "Fidelización" page:

1. Toggle program on (`loyalty_programs`, `type='stamps'`, `stamps_per_visit=1`).
2. Create rewards: pick type →
   - **Free dish**: dish picker from existing menu.
   - **% discount**: percentage field.
   - **Special price**: dish picker + price field.
     Each with a stamp `cost`.
3. **Ticket medio** (average spend per visit, €): a single optional field the
   owner fills in once — powers the loyalty-return estimate in insights
   (stored in `loyalty_programs.rules_json`, no migration). If empty, the
   return chart shows a prompt to set it instead of numbers.
4. Preview of what the client card will look like.

### Fidelidad page (staff, daily)

One mobile-first page in the admin app with two elements:

1. **The venue code**, big and readable across a counter: `4 8 3 2` with a
   subtle countdown ring to the next rotation (~3 min). Staff reads it out when
   a customer asks for a stamp. Nothing to tap. The code is **per branch** (the
   staff device's active branch), so a granted stamp is automatically
   branch-attributed — the server matches the submitted code against the
   restaurant's branches to attribute the visit.
2. **Pending redemptions list** below: each row shows email · reward name ·
   stamp cost · "hace 5 s", with **✓ Validar** / **✗ Rechazar**. Stale rows
   vanish via lazy expiry. Races are safe: two devices validating the same row
   → second gets a conflict and the list refreshes.

Success toast with **Deshacer** on both grant and validation (compensating
`adjust` transaction — idempotent undo). Optional later: print the "ask for the
code" hint on table QR stands so customers know stamps exist.

### Insights (owner)

"Fidelización" gets an insights view, all derivable from existing tables:

- **Health numbers** (top cards): active cards, stamps given this month,
  redemptions this month, redemption rate, repeat-visit rate.
- **Customer table**: email · stamps balance · total visits · first visit ·
  last visit · rewards redeemed. Sortable, searchable, CSV export.
- **Inactive filter** on that table: last visit > N days (default 30) — the future
  hook for `campaigns`.
- **Visits chart**: loyalty visits per day/week, new vs returning split
  (from `customer_visits` + `customer_restaurants.first_visit_at`).
- **Loyalty return chart** ("Retorno de fidelización"): estimated revenue
  driven by the program vs the cost of redeemed rewards, per month, with a
  headline ratio ("Por cada 1 € en premios, tus clientes fieles gastaron ~12 €").

  How it's computed — an **estimate**, clearly labeled as such in the UI:
  - Per validated redemption: `estimated revenue = stamps cost of the reward
(≈ visits driven) × ticket medio`. Where the customer's real visit count
    since their previous redemption is available, use it instead of the stamp
    cost — it's exact.
  - Reward cost by type: **free_dish** → current menu price of the dish
    (most accurate); **special_price** → menu price − special price;
    **percentage_discount** → `percentage × ticket medio` (least accurate,
    double-depends on the estimate).
  - Requires the owner-provided **ticket medio**; without it the chart shows
    an empty state prompting for it.

  Honest caveat (shown as a footnote in the UI): this measures correlation,
  not causality — some of those visits would have happened without the
  program. Exact measurement needs per-ticket amounts (POS/orders
  integration), which is out of scope for v1.

## Security notes

- **Card token**: a signed HMAC token containing `customer_id` + `restaurant_id`,
  stored in `localStorage` — this is how the customer's device authenticates as
  "this card". Long-lived; safe because earning requires the venue code and
  redeeming requires staff validation.
- **Venue code**: `HMAC(LOYALTY_TOKEN_SECRET, restaurantId + branchId + floor(now / window))`
  truncated to 4 digits, window ~3 min, previous window accepted. Verification
  is a pure computation — no storage, no sync. Brute force is bounded by the
  per-card attempt throttle and the 4 h rate limit (a successful guess yields
  exactly one stamp).
- **Abuse ceiling**: someone physically present who didn't consume (a friend at
  the table overhearing the code) can earn one stamp per 4 h per email — which
  is roughly the program working as intended (a stamp per visit per person).
  Remote attackers can't read the code; expired codes are worthless.
- All admin endpoints (code display, validate/reject, undo, insights) require
  an authenticated `restaurant_users` session scoped to the restaurant.

## Backend impact (relative to the implemented QR version)

The ledger (earn/redeem/undo), lazy expiry, program/reward CRUD, insights, and
the redemption request/cancel/status surface are **unchanged**. Deltas:

- New: venue-code helper (TOTP-style generate/verify, ~30 lines, reuses
  `LOYALTY_TOKEN_SECRET`); `loyalty.earnStamp({ cardToken, venueCode })`
  (public — verifies code, rate limit, then runs the existing earn write);
  `admin.loyalty.venueCode({ branchId })` and
  `admin.loyalty.pendingRedemptions` + `admin.loyalty.rejectRedemption` (tenant).
- New: 4 h earn rate-limit check + per-card code-attempt throttle.
- New: `ticketMedio` persisted in `loyalty_programs.rules_json` (schema column
  already exists) + an `admin.loyalty.insights.loyaltyReturn` query joining
  validated redemptions with reward type/dish prices and visit counts.
- Removed: `admin.loyalty.resolveScan`, `admin.loyalty.addStamp` (earning is no
  longer staff-initiated), and the QR token types (`card`/`redeem` QR payloads);
  the card-token HMAC signing stays.
- No new tables, no migration.

## Out of scope (later)

- **v2 — wallet passes**: "Add to Apple/Google Wallet" button on the card screen
  (persistence + lock-screen geofence surfacing + push-updated balance). Pure
  add-on; the pass would carry the same card-token URL. Requires Apple
  Developer cert + Google Wallet issuer account — not worth it for beta.
- Points-per-€ mode (ticket amount entry) and per-reward variable economics.
- **Exact loyalty ROI** via per-ticket amounts (POS/orders integration) —
  would upgrade the loyalty return chart from estimate to measurement.
- Gift cards / stored value.
- Staff PIN mode (code display without full admin account).
- Configurable rate-limit / rotation windows, fraud flags.
- Campaigns to inactive customers (schema already exists).
