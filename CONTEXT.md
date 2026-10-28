# Qmenut Product Language

Shared business vocabulary for describing Qmenut consistently to restaurant owners,
guests, salespeople, and product contributors.

## Market

**Launch client**:
A concept-led independent restaurant, café, or small hospitality group with a defined
brand and ambitions to develop its proposition, but without an owned website where guests
can browse its current menu.
_Avoid_: Any restaurant, venue defined only by category, price-only buyer

**Evaluating guest**:
A guest comparing a restaurant with other options before deciding whether to visit, often
after discovering it through a map, search result, social profile, or recommendation.
_Avoid_: Lead, traffic, scan

**Restaurant**:
The hospitality business that subscribes to Qmenut and controls the experience presented
to its guests.
_Avoid_: Tenant, account, user

**Guest**:
A person exploring or visiting a restaurant through its Qmenut experience.
_Avoid_: End user, traffic, scan

**Branch**:
One physical venue with its own published experience and subscription.
_Avoid_: Tenant, instance

**Group**:
One restaurant brand operating two or more branches under a shared commercial
relationship, centralized billing, and one price per branch in Qmenut.
_Avoid_: Franchise when the business is not franchised, multi-tenant account

## Access

**User account**:
A global identity identified by email that can sign in to Qmenut and may belong to one or more
restaurants.
_Avoid_: Guest, restaurant, membership

**Restaurant membership**:
The relationship between a user account and one restaurant, including its role and active
state. A membership is the authorization boundary for the admin panel.
_Avoid_: User, account, branch access

## Product

**Qmenut**:
The product and commercial brand, always written with a final “t”.
_Avoid_: Qmenu, QMenu, Q-menu

**Direct digital channel**:
The restaurant-owned web presence that connects the restaurant directly with guests
before, during, and after a visit, without requiring a marketplace or downloaded app.
_Avoid_: Digital menu, QR menu, menu software

**Professional digital presence**:
A branded, coherent, and readable presentation that gives evaluating guests confidence
that the restaurant takes the same care online as it does in the venue.
_Avoid_: Premium UX, better technology, modern website

**Always-on presence**:
A guest-facing presence that delivers value continuously while requiring restaurant staff
to intervene only when information changes or they want to review results.
_Avoid_: Daily-use tool, engagement platform, another task for the owner

**Functional refinement**:
Qmenut's standard of clear hierarchy, brand coherence, legibility, and frictionless use,
with motion used only when it helps rather than to attract attention to itself.
_Avoid_: Fancy design, animation-heavy experience, technical quality

**Public menu**:
The guest-facing part of the direct digital channel where the restaurant presents its
food, drinks, prices, choices, and allergen information.
_Avoid_: PDF menu, QR menu

**Onboarding**:
The assisted setup in which Qmenut turns the restaurant's existing menu and brand
material into a ready-to-use channel before the restaurant takes control of routine edits.
_Avoid_: Data entry, account creation

**Self-managed menu**:
A menu whose routine content, prices, availability, and corrections are maintained by the
restaurant after onboarding; Qmenut provides product support but no manual editing service.
_Avoid_: Managed menu, menu concierge

**Demo restaurant**:
A realistic example restaurant used to demonstrate the complete Qmenut experience; it is
product proof, not customer or commercial proof.
_Avoid_: Customer example, case study

**Launch beta**:
The first cohort of ten restaurants in Spain and ten in Venezuela that use Qmenut for
three months in exchange for close feedback, basic onboarding participation, and the
possibility of a testimonial before moving to a paid launch offer.
_Avoid_: Free plan, permanent trial

**Product evolution**:
Improvements Qmenut releases to the shared platform for its restaurant base rather than
custom development controlled by one restaurant.
_Avoid_: Bespoke development, included custom feature

**Core plan**:
The subscription for Qmenut's direct digital channel and its non-transactional product
improvements; future ordering, delivery, rider, and payment capabilities are excluded.
_Avoid_: All future Qmenut products, delivery-inclusive plan

**Feature request**:
Feedback considered alongside requests from other restaurants and Qmenut's product
direction; submitting one does not commit Qmenut to building it.
_Avoid_: Requirement, committed feature

**Business signal**:
An observed interaction that helps a restaurant estimate attention or activity without
proving that a visit, contact action, or menu view produced a sale.
_Avoid_: Sale, conversion, customer count

**Source price currency**:
The currency in which the restaurant enters and maintains its menu prices. For the
Venezuelan beta, the proposed source price currency is USD.
_Avoid_: Base currency when speaking to restaurant owners, settlement currency

**Derived display price**:
A guest-facing amount calculated from the source price using a named exchange rate,
without replacing the restaurant's source price. For Venezuela, the proposed derived
display price is VES using the official BCV rate.
_Avoid_: Price entered by the restaurant, guaranteed real-time price

**Restaurant-selected display rate**:
The VES-per-USD rate that a Venezuelan restaurant stores and controls in Qmenut for its
guest-facing derived prices. The owner and authorised restaurant operators may change it;
it is independent from the external market reference.
_Avoid_: Official BCV rate, automatic rate, source price currency

**Market exchange-rate reference**:
A read-only external reference captured from BCV sources by Ming Exchange Rate Worker and
exposed to Qmenut through a private service binding. It informs the admin panel but never
changes menu prices or the restaurant-selected display rate.
_Avoid_: Restaurant-selected display rate, price source, public exchange-rate API

**Consent-light analytics**:
Measurement configured without tracking cookies or persistent analytics identifiers on
the guest's device, while retaining only storage that is technically necessary for a
feature the guest requests. Whether a consent banner is unnecessary depends on the final
configuration and legal review.
_Avoid_: Cookie-free website, no consent required under all circumstances

**Domain custody**:
Qmenut's operational control of a restaurant's domain and Cloudflare configuration while
recognizing the restaurant's ownership rights, right to request a transfer, and right to
use it until the paid registration period ends after cancellation.
_Avoid_: Qmenut-owned domain, non-transferable domain

**Brand domain**:
The principal domain registered and managed for one restaurant brand under Qmenut's
domain-custody policy.
_Avoid_: Qmenut domain, platform domain

**Branch subdomain**:
A location-specific hostname beneath the brand domain that publishes one branch's Qmenut
experience.
_Avoid_: Separate website, branch path

**Product support**:
Help using Qmenut or resolving product problems through WhatsApp during business hours;
it excludes manual menu editing and round-the-clock availability.
_Avoid_: Managed service, 24/7 support, menu editing service

**Roadmap feature**:
A capability Qmenut intends to build but does not currently sell or promise as available.
Delivery is presently a roadmap feature.
_Avoid_: Coming feature, included soon

**Image publication intent**:
The restaurant's requested image selection for a logo, gallery, category, or dish,
which becomes visible once its images are ready. A newer selection replaces the earlier intent.
_Avoid_: Image processing job, upload status

**Image upload ownership**:
The relationship between an uploaded image and the restaurant, branch, and purpose
that may use it in Qmenut.
_Avoid_: Processing lifecycle, image publication

## Loyalty

**Loyalty card**:
A guest's stamp balance at one restaurant, identified by their email and shared by all of
its branches.
_Avoid_: Account, wallet, membership

**Stamp**:
The loyalty unit a guest collects, usually one per product bought, and spends on rewards.
_Avoid_: Point, visit

**Venue code**:
The four-digit code, different for each branch and changing every few minutes, that staff
read out to prove a guest is at the branch.
_Avoid_: Branch code, PIN, token

**Stamp request**:
A guest's claim, made with a branch's venue code, for a number of stamps for what they
bought on one visit. It stays pending until staff accept it, accept fewer, or decline it,
or until it has gone unanswered for 12 hours and is accepted automatically.
_Avoid_: Earn request, stamp claim, pending earn

**Pending stamps**:
Stamps in a stamp request that staff have not yet accepted. They show on the guest's card
but cannot be spent.
_Avoid_: Provisional balance, unconfirmed stamps

**Stamp request limit**:
The most stamps one stamp request may claim, set by the restaurant.
_Avoid_: Max per visit, quantity cap

**Reward**:
Something a guest can get for a set number of stamps, such as a free dish or a discount.
_Avoid_: Prize, perk

**Redemption**:
A guest spending stamps on a reward. It stays pending until staff validate it at the
counter, and the stamps are deducted only then.
_Avoid_: Claim, stamp request

## Reservations

**Reservation**:
A guest's request to hold one table at one branch for one reservation slot. It stays
pending until restaurant staff accept or decline it, or until its response time ends and
it is accepted automatically.
_Avoid_: Booking, table request

**Response time**:
The period staff have to accept or decline a pending reservation before it is accepted
automatically. It never runs past the lead time before the slot.
_Avoid_: Expiry, SLA

**Reservation slot**:
A start time, chosen by the restaurant, at which a branch takes reservations.
_Avoid_: Hour, time button, shift

**Slot capacity**:
The maximum number of reservations a branch takes for one reservation slot, one per
table, whatever the party size. Pending and accepted reservations both count; a slot that
has reached it is full.
_Avoid_: Covers, seats

**Online party limit**:
The largest party a guest can reserve online at a branch; larger groups contact the
branch directly.
_Avoid_: Max covers, group size

**Reservation window**:
The period in which a reservation slot can be requested: from a set number of days ahead
until a set lead time before the slot starts.
_Avoid_: Booking horizon, availability

**Slot closure**:
A date, or one reservation slot on a date, that staff have closed to online reservations,
for example for a holiday, a private event, or tables taken by phone.
_Avoid_: Block, blackout, manual booking

**Acceptance notice**:
The message telling the guest that staff accepted their reservation.
_Avoid_: Confirmation

**Attendance check**:
The message sent shortly before an accepted reservation asking the guest to confirm
that they will come, or to cancel.
_Avoid_: Confirmation, reminder

**Unconfirmed reservation**:
An accepted reservation whose guest has not answered the attendance check by its
deadline. It still holds its table; staff decide whether to give the table away.
_Avoid_: No-show, released reservation

## Notifications

**Notification**:
A notice shown to one restaurant member in the admin panel about something that needs their
attention, and possibly also delivered to their push devices. Qmenut support accounts never
receive restaurant notifications.
_Avoid_: Alert, message

**Announcement**:
A notification written by Qmenut for restaurants, such as product news, maintenance or an
upgrade offer, rather than one caused by activity at the restaurant.
_Avoid_: Broadcast, newsletter, message

**Push device**:
A phone, tablet or computer on which a member has turned on push notifications; it follows
one or more of the restaurant's branches and receives pushes only for those.
_Avoid_: Subscription, endpoint, browser
