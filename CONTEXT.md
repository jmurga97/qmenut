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
