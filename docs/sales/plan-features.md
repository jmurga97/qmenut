# Plan features

What each plan includes, feature by feature. Prices and the launch offer live in the
pricing ladder; this page only defines scope. Enforcement (entitlements, gating, downgrade
behaviour) is defined separately and should use the feature keys below.

Status: draft, 22 October 2026. Items marked **(confirm)** are recommendations, not yet
decided.

## Plans in one line

- **Basic (€15)**: a simple, fixed-look digital menu with a contact page. One location,
  one template, logo and cover photo only.
- **Business (€55)**: everything the product does today: templates and customization,
  languages, promotions, loyalty, analytics, multi-location, staff roles.
- **Delivery add-on (on top of Business)**: online ordering. Pickup first (€60 add-on),
  then delivery with riders and fleet (€230 total). Not built yet.

## Feature matrix

`✓` included, `—` not included, `new` must be built before the plan can be sold.

### Public menu (what diners see)

| Feature                                                    | Key                     | Basic        | Business | Delivery |
| ---------------------------------------------------------- | ----------------------- | ------------ | -------- | -------- |
| Menu page: categories, dishes, prices, descriptions        | `menu`                  | ✓            | ✓        | ✓        |
| Dish photos                                                | `menu.dishPhotos`       | ✓ (confirm)  | ✓        | ✓        |
| Category images                                            | `menu.categoryImages`   | —            | ✓        | ✓        |
| Variants and extras shown on the dish                      | `menu.variants`         | ✓            | ✓        | ✓        |
| Allergens and dietary tags                                 | `menu.allergens`        | ✓            | ✓        | ✓        |
| Sold-out toggle                                            | `menu.availability`     | ✓            | ✓        | ✓        |
| Time-based availability windows (breakfast, lunch menus)   | `menu.schedules`        | —            | ✓        | ✓        |
| Featured dishes and the `/destacados` page                 | `highlights`            | —            | ✓        | ✓        |
| Promotions and discounted prices                           | `promotions`            | —            | ✓        | ✓        |
| Contact page: address, map, hours, phone, social links     | `contact`               | ✓            | ✓        | ✓        |
| Contact page: photo gallery                                | `contact.gallery`       | —            | ✓        | ✓        |
| Contact page: Google reviews                               | `contact.googleReviews` | —            | ✓        | ✓        |
| Legal pages (aviso legal, privacidad)                      | `legal`                 | ✓            | ✓        | ✓        |
| Languages and translations, locale routes, hreflang        | `languages`             | —            | ✓        | ✓        |
| VES display price for USD menus                            | `currency.ves`          | ✓ (confirm)  | ✓        | ✓        |
| Loyalty points page `/puntos`                              | `loyalty`               | —            | ✓        | ✓        |
| Reservations                                               | `reservations`          | —            | new      | new      |
| Installable app (branded manifest and icons, offline page) | `pwa`                   | — (confirm)  | ✓        | ✓        |
| SEO: title, Open Graph, restaurant JSON-LD, sitemap        | `seo`                   | ✓            | ✓        | ✓        |
| "Made with QMenut" footer badge                            | `branding.badge`        | always shown | hideable | hideable |

### Look and feel

| Feature                                           | Key               | Basic                      | Business | Delivery |
| ------------------------------------------------- | ----------------- | -------------------------- | -------- | -------- |
| QMenut template (Ming look: ink on paper, Geist)  | `theme.qmenut`    | new, fixed                 | ✓        | ✓        |
| The five templates (fine, her, fast, cafe, tapas) | `theme.templates` | —                          | ✓        | ✓        |
| Brand colors                                      | `theme.colors`    | —                          | ✓        | ✓        |
| Fonts, tagline, photo display toggles             | `theme.custom`    | —                          | ✓        | ✓        |
| Logo                                              | `branch.logo`     | ✓                          | ✓        | ✓        |
| Cover photo (portrait)                            | `branch.cover`    | ✓                          | ✓        | ✓        |
| Own domain                                        | `customDomain`    | — `<slug>.qmenut.app` only | ✓        | ✓        |

### Owner dashboard

| Feature                                            | Key             | Basic                | Business | Delivery |
| -------------------------------------------------- | --------------- | -------------------- | -------- | -------- |
| Menu editor (categories, dishes, extras, tags)     | `menu`          | ✓                    | ✓        | ✓        |
| Branch info: address, hours, socials, legal        | `branch`        | ✓                    | ✓        | ✓        |
| QR code download and printable QR                  | `qr`            | ✓                    | ✓        | ✓        |
| Printable PDF menu                                 | `menuPrint`     | — (confirm)          | ✓        | ✓        |
| Local exchange rate (VES)                          | `exchangeRates` | ✓ if `currency.ves`  | ✓        | ✓        |
| Promotions editor                                  | `promotions`    | —                    | ✓        | ✓        |
| Languages and translations                         | `languages`     | —                    | ✓        | ✓        |
| Loyalty program, insights, staff stamping          | `loyalty`       | —                    | ✓        | ✓        |
| Analytics                                          | `analytics`     | —                    | ✓        | ✓        |
| Team: owner, admin and staff roles                 | `users`         | owner only (confirm) | ✓        | ✓        |
| Several locations under one restaurant (franchise) | `multiBranch`   | — one location       | ✓        | ✓        |
| Billing                                            | `billing`       | ✓                    | ✓        | ✓        |

### Ordering (Delivery add-on)

Nothing below exists yet. Pickup ships first as the €60 add-on; delivery folds it in.

| Feature                                                        | Key                 | Pickup add-on | Delivery |
| -------------------------------------------------------------- | ------------------- | ------------- | -------- |
| Cart and checkout from the public menu                         | `ordering`          | new           | new      |
| Online payment through the restaurant's Stripe Connect account | `ordering.payments` | new           | new      |
| Order inbox with statuses (received, preparing, ready, done)   | `ordering.inbox`    | new           | new      |
| Pickup time slots and prep-time estimate                       | `ordering.pickup`   | new           | new      |
| Customer notifications (WhatsApp or email)                     | `ordering.notify`   | new           | new      |
| Delivery zones, minimum order, delivery fee                    | `ordering.delivery` | —             | new      |
| Rider app (assigned orders, navigation, proof of delivery)     | `riders`            | —             | new      |
| Fleet management (riders, shifts, live map, assignment)        | `fleet`             | —             | new      |
| Included-orders counter (fair use 600-800, then per order)     | `ordering.usage`    | —             | new      |

## Work needed before each plan can be sold

**Basic**

- Build the `qmenut` template: a sixth preset in `packages/ui/src/theme/presets.ts` with the
  Ming look, fixed colors and fonts. Recommended: also selectable in Business, so Basic is a
  locked subset rather than a separate look.
- Cover photo already exists: the menu header uses the first branch photo (`heroPhotoUrl`). Basic limits the
  gallery to that one photo.
- Self-serve onboarding on a `qmenut.app` subdomain. See the next section.

**Business**

- Reservations are promised in the ladder but not built. Either build them or drop them
  from the Business pitch until they exist.

**Delivery**

- Everything in the ordering table.

## Self-serve onboarding (Basic)

At €15 an operator cannot onboard each restaurant by hand. A customer must go from the
landing page to a live menu at `<slug>.qmenut.app` with nobody from QMenut involved.
Basic and Business share this flow; Business adds its own domain afterwards.

### How onboarding works today

Every step is operator-run from `qmenut-ops`:

- `agent-intake.ts` builds `intakes/<slug>/draft.json` from the restaurant's menu source,
  and `onboard.ts` or `create-tenant.ts` publishes it. That writes the theme to KV, inserts
  the restaurant, branch and owner rows in D1, adds the support accounts, and creates a
  `trialing` subscription row.
- The hostname is attached by hand in the Cloudflare dashboard (Workers & Pages >
  `qmenut-web` > Custom domain), once per tenant.
- Sign-up is disabled (`disableSignUp: true`); an owner can only sign in once someone
  has provisioned their account.
- Billing knows a single plan, `basic`, and the ops tenant schema only accepts
  `planCode: "basic"`.

### What has to exist in the product

| Step               | What it needs                                                                                                                                                                                                                                                                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Sign up         | A public sign-up path with email OTP that creates only an owner with no restaurant yet. Everything else stays provision-only. Rate-limited per IP and per email.                                                                                                                                                                                                            |
| 2. Choose the slug | Slug from the restaurant name, editable, checked live for availability. A reserved list (`admin`, `api`, `www`, `app`, `dev`, `staging`, `mail`, `help`, the demo tenants) and format rules (lowercase, `a-z0-9-`, 3–40 characters). `customDomain` becomes `<slug>.qmenut.app`.                                                                                            |
| 3. Create tenant   | An API handler that does what `create-tenant.ts` does today: restaurant, branch, owner membership, support accounts, `trialing` subscription row, and the default theme written to KV through `tenant-config`. It must be idempotent, and if the KV write fails it must not leave a half-built tenant. QMenut cannot import `qmenut-ops`, so this logic moves into the API. |
| 4. Routing         | One wildcard route, `*.qmenut.app/*`, on `qmenut-web`, set up once, so a new tenant needs no dashboard step. Universal SSL already covers one subdomain level. `admin.`, `api.` and `dev.` must keep resolving to their own Workers. An unknown slug gets a 404 with a link to sign up, never another tenant's menu.                                                        |
| 5. Guided setup    | A first-run checklist in the admin: logo, cover photo, address and hours, legal details (holder name, NIF/RIF, address; Spain's LSSI requires them for the aviso legal), and at least one category and dish. Then download the QR code and go live.                                                                                                                         |
| 6. Menu entry      | v1: the existing editor, with an empty-state guide. v2: upload a photo, PDF or link of the menu, have the AI extract a draft, then the owner reviews it. This reuses the intake schema from `agent-intake.ts`.                                                                                                                                                              |
| 7. Pay             | Stripe Checkout with a card up front and a 14-day trial, from the existing `billing.checkout`. The plan chosen (Basic or Business) is the Checkout price.                                                                                                                                                                                                                   |
| 8. Go live         | The public menu is served only while the subscription is `trialing` or `active` and the checklist minimum is met. Before that it shows a "coming soon" placeholder, so empty menus never reach diners.                                                                                                                                                                      |
| 9. Upgrade later   | Moving to Business keeps the same tenant. The owner can add their own domain later (operator-assisted until Cloudflare for SaaS custom hostnames are automated), and the `qmenut.app` subdomain should redirect to it.                                                                                                                                                      |

Abuse and lifecycle (squatted brand slugs, spam sign-ups, unpaid or cancelled tenants,
deletion) belong to the constraints work, but step 2's reserved list and step 1's rate
limit are needed from day one.

## Decided

- Payment: card up front with a 14-day trial, for every plan.
- Business signs up through the same self-serve flow, starting on a `qmenut.app`
  subdomain.
- AI menu import (step 6, v2) comes after the plan changes. It is wanted, not dropped.

## Open decisions

1. Dish photos in Basic. Recommended yes: a menu without photos sells poorly, and the cost
   is storage only.
2. VES display in Basic. Recommended yes for Venezuela: a USD menu without bolívares is not
   usable there, and it would make Basic unsellable in that market.
3. Team members in Basic. Recommended owner only, or owner plus one staff for the
   sold-out toggle.
4. Printable PDF menu and installable app in Basic. Recommended no, both are cheap upgrade
   reasons.
5. Pickup add-on versus Delivery: whether pickup stays a separate add-on long term or only
   until Delivery ships.
