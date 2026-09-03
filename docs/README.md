# qmenut documentation

qmenut is a multi-tenant restaurant menu SaaS. A restaurant owner manages the menu,
branding, promotions, and loyalty program from an admin dashboard. Diners browse a
per-tenant public menu on the restaurant's own domain.

These pages describe the system as it is implemented. Each page names the source files
that implement the behavior it describes, so you can read a page with the code open.

## Before you start

Read the following pages in this order:

1. [Architecture](architecture.md). Describes the monorepo, the Cloudflare Workers, the
   data layer, and how a request flows through the system.
2. [Multi-tenancy](domains/multi-tenancy.md). Describes the tenant model and how tenant
   isolation is enforced. Every feature is scoped by these rules, so read this page
   before any feature page.
3. [Theming](domains/theming.md) and [Custom domains](domains/custom-domains.md).
   Describe how a branch gets its appearance and its own domain.

After that, read feature pages as you need them.

## Documentation map

### Foundation

| Page                            | Description                                                         | Status   |
| ------------------------------- | ------------------------------------------------------------------- | -------- |
| [Architecture](architecture.md) | Monorepo, Workers, data layer, request flow, and build conventions. | Complete |

### Domains

| Page                                        | Description                                                  | Status   |
| ------------------------------------------- | ------------------------------------------------------------ | -------- |
| [Multi-tenancy](domains/multi-tenancy.md)   | Restaurant and branch model, and tenant isolation.           | Complete |
| [Theming](domains/theming.md)               | Color engine, templates, and per-tenant theme.               | Complete |
| [Custom domains](domains/custom-domains.md) | Host resolution and the tenant-config Worker.                | Complete |
| [Loyalty](domains/loyalty.md)               | Points and stamps, rewards, redemptions, and the venue code. | Complete |
| [Menu management](domains/menu.md)          | Categories, dishes, variants, and availability.              | Partial  |
| [Promotions](domains/promotions.md)         | Promotions and effective pricing.                            | Partial  |
| [Internationalization](domains/i18n.md)     | Languages and DeepL translations.                            | Partial  |
| [Billing](domains/billing.md)               | Stripe subscriptions, one per branch.                        | Partial  |
| [Auth](domains/auth.md)                     | Better Auth email-OTP sign-in.                               | Partial  |
| [QR codes](domains/qr.md)                   | QR code generation in the admin dashboard.                   | Partial  |

### Applications

| Page                                          | Description                                            | Status   |
| --------------------------------------------- | ------------------------------------------------------ | -------- |
| [Public menu Worker](apps/web-public-menu.md) | The SSR Worker that serves every tenant domain.        | Complete |
| [Public menu PWA](apps/web-pwa.md)            | Manifest, icons, service worker, and offline behavior. | Complete |
| [Admin dashboard](apps/admin.md)              | The owner dashboard SPA.                               | Partial  |

The marketing site, `apps/landing`, is covered in [Architecture](architecture.md).

### Design and operations

| Page                                                             | Description                                                | Status   |
| ---------------------------------------------------------------- | ---------------------------------------------------------- | -------- |
| [Loyalty UX](design/loyalty-ux.md)                               | Loyalty UX decisions and the reasoning behind them.        | Complete |
| [Restaurant intake](operations/onboarding-intake.md)             | Data to collect before onboarding a restaurant (Spanish).  | Complete |
| [Branch address maps](operations/branch-geocoding.md)            | Leaflet maps, Places API (New) autocomplete, key handling. | Complete |
| [Database migrations](operations/database-migrations.md)         | Drizzle schema to generated SQL to D1.                     | Complete |
| [Image uploads](operations/image-uploads.md)                     | Private R2 uploads, optimization, and verified URLs.       | Complete |
| [Deployment](operations/deployment.md)                           | Cloudflare deployment runbook.                             | Complete |
| [Performance and caching](operations/performance-and-caching.md) | Edge and browser caching, and cache invalidation.          | Complete |
| [Testing](operations/testing.md)                                 | Local end-to-end topology, reset, and visual snapshots.    | Complete |
| [Production checklist](operations/production-checklist.md)       | Ranked production blockers and follow-up work.             | Complete |

### Archive

The [archive](archive/) directory holds superseded design notes. Do not treat them as
current documentation; each file starts with a banner that names its replacement.
`initial-design.md` describes an abandoned GraphQL and gateway design.

## Status values

| Value    | Meaning                                                                                 |
| -------- | --------------------------------------------------------------------------------------- |
| Complete | The page is written and has been checked against the code.                              |
| Partial  | The page has the purpose, the structure, and a key-file table, but no full walkthrough. |

The status describes the documentation page, not the feature. Each page states the
implementation status of its feature in its own `Status` section.

## Page structure

Domain pages use the same sections in the same order:

1. `Status`. What the feature does, what is implemented, and what is missing.
2. `Data model`. Tables, relationships, and key fields, with paths under
   `packages/db/src/schema/`.
3. `Backend`. The tRPC router, the module handlers, the repositories, the procedure
   type, and how tenant isolation is enforced.
4. `Frontend`. Admin routes, public routes, and feature directories.
5. `Example`. One end-to-end trace with `file:line` references.
6. `Key files`. A table that maps a path to its responsibility.
7. `Limitations`. Caveats, known gaps, and things to verify.

## Accuracy of file references

Line numbers drift as the code changes. Treat a `file:line` reference as approximate and
rely on the file path and the symbol name. The code is authoritative. If a page
contradicts the code, update the page.
