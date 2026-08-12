# qmenut — Codebase Documentation

qmenut is a multi-tenant restaurant-menu SaaS. A restaurant owner manages their
menu, branding, promotions and loyalty program from an admin dashboard; diners
browse a fast, per-tenant public menu at the restaurant's own domain.

This documentation is both a **reference** and a **guided tour of the code**: every
doc explains a strategic division of the system _and_ points at the real files, so
you can read the doc with the source open beside it.

## How to read this

Start here, in order:

1. [architecture.md](architecture.md) — the shape of the whole system: the Bun
   monorepo, the Cloudflare Workers, the data layer, and how a request flows.
2. [domains/multi-tenancy.md](domains/multi-tenancy.md) — the tenant model
   (restaurant → branch) and how tenant isolation is enforced. **Read this before
   any feature doc** — every feature is scoped by it.
3. [domains/theming.md](domains/theming.md) and
   [domains/custom-domains.md](domains/custom-domains.md) — how a branch gets its
   look and its own domain.
4. Any feature doc under [domains/](domains/) as needed.

## Map

### Foundation

- [architecture.md](architecture.md) — monorepo, workers, data layer, request flow, conventions ✅

### Domains

- [domains/multi-tenancy.md](domains/multi-tenancy.md) — restaurant/branch model, tenant isolation ✅
- [domains/theming.md](domains/theming.md) — the color-engine, presets, per-tenant theme ✅
- [domains/custom-domains.md](domains/custom-domains.md) — host resolution, the tenant-config worker ✅
- [domains/loyalty.md](domains/loyalty.md) — points/stamps, rewards, redemptions, venue code ✅
- [domains/menu.md](domains/menu.md) — categories, dishes, variants, availability 🧩
- [domains/promotions.md](domains/promotions.md) — promotions & effective pricing 🧩
- [domains/i18n.md](domains/i18n.md) — languages & DeepL translations 🧩
- [domains/billing.md](domains/billing.md) — Stripe subscriptions per branch 🧩
- [domains/auth.md](domains/auth.md) — Better Auth email-OTP login 🧩
- [domains/qr.md](domains/qr.md) — QR code generation 🧩

### Apps

- [apps/web-public-menu.md](apps/web-public-menu.md) — the public menu SSR worker ✅
- [apps/web-pwa.md](apps/web-pwa.md) — installable menu: manifest, icons, service worker, offline ✅
- [apps/admin.md](apps/admin.md) — the owner dashboard SPA 🧩
- The deployable marketing site `apps/landing` is covered in [architecture.md](architecture.md).

### Design & operations

- [design/loyalty-ux.md](design/loyalty-ux.md) — loyalty UX decisions & rationale
- [operations/onboarding-intake.md](operations/onboarding-intake.md) — data to collect before onboarding a restaurant
- [operations/branch-geocoding.md](operations/branch-geocoding.md) — Leaflet maps, MapTiler autocomplete, key handling ✅
- [operations/database-migrations.md](operations/database-migrations.md) — class: Drizzle schema → generated SQL → D1 ✅
- [operations/deployment.md](operations/deployment.md) — zero-to-live Cloudflare runbook ✅
- [operations/performance-and-caching.md](operations/performance-and-caching.md) — edge/browser caching and invalidation ✅
- [operations/testing.md](operations/testing.md) — local E2E topology, reset, and visual snapshots ✅
- [operations/production-checklist.md](operations/production-checklist.md) — ranked production blockers and follow-ups ✅

### Archive

- [archive/](archive/) — superseded design notes kept for history. **Do not treat as
  current** — see each file's banner. `intial-design.md` in particular describes an
  abandoned GraphQL/gateway design.

## Status legend

- ✅ **complete** — written and traced against the code.
- 🧩 **stub** — headings + a Purpose paragraph + a key-file table, ready to expand.

## The doc template

Every domain doc follows the same skeleton, so the set reads consistently and each
one works as a walkthrough:

1. **Purpose & status** — what it does; complete / partial / WIP + known gaps.
2. **Data model** — tables, relationships, key fields (with `packages/db/src/schema/*` paths).
3. **Backend** — tRPC router + module handlers + repositories; procedure type; how isolation is enforced.
4. **Frontend** — admin and/or public routes and feature folders.
5. **Walkthrough** — an end-to-end trace with `file:line` references to read along.
6. **Key files** — a path → responsibility table.
7. **Notes & gotchas** — caveats, WIP gaps, things to verify.

## A note on accuracy

Line numbers drift as the code changes. Treat `file:line` references as "roughly
here" and trust the file path plus the symbol name. When in doubt, the code wins;
if you find a doc that contradicts the code, fix the doc.
