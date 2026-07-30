# Architecture

The shape of the whole system: what the monorepo contains, the three Cloudflare
Workers that make it run, the data layer, and how a request flows end to end.

> Prerequisite for everything else. Read this first, then
> [domains/multi-tenancy.md](domains/multi-tenancy.md).

## Monorepo layout

A **Bun `1.3.6` workspace** orchestrated by **Turbo** (`turbo.json`). Workspace globs
are declared in the root `package.json` (`apps/*`, `packages/*`, `e2e`).

### Apps (`apps/`)

| App | Package | What it is |
|---|---|---|
| `apps/api` | `@qmenut/api` | The backend. A Cloudflare Worker: tRPC at `/trpc`, Better Auth at `/api/auth/*`, Stripe webhooks, Drizzle over D1. Entry: `apps/api/src/index.ts`. |
| `apps/web` | `@qmenut/web` | The **public menu** diners see. React 19 + Vite + TanStack Start, server-rendered on a Cloudflare Worker (Nitro `cloudflare-module` preset). |
| `apps/admin` | `@qmenut/admin` | The **owner dashboard**. React 19 + Vite SPA (TanStack Router), deployed as a static-asset Worker with SPA fallback. |
| `apps/tenant-config` | `@qmenut/tenant-config` | Small Worker that owns write access to the `TENANT_THEME` KV namespace. Entry: `apps/tenant-config/src/index.ts`. |

### Packages (`packages/`)

| Package | What it is |
|---|---|
| `packages/db` | Drizzle ORM: schema (by domain), models, mappers, domain logic, and the repository layer (all data access). |
| `packages/auth` | Better Auth setup (email-OTP) over Drizzle. Server export + `./client`. |
| `packages/permissions` | Pure role/permission logic (`ROLE_CODES`, permission checks). Unit-tested with `bun test`. |
| `packages/ui` | Shared UI: Lit web components + React wrappers, and the **theme system** (`theme/`). Used by web, admin, api, and tenant-config. |

## The three Workers

Everything runs on Cloudflare. Three Workers, wired together with **service bindings**
and a **shared KV namespace** — there is no separate server.

```
                 diners                         restaurant owners
                   │                                   │
                   ▼                                   ▼
        ┌───────────────────┐               ┌───────────────────┐
        │  apps/web (SSR)   │               │   apps/admin      │
        │  qmenut-web       │               │   (static SPA)    │
        └─────────┬─────────┘               └─────────┬─────────┘
      reads       │  API_WORKER (service binding)     │ tRPC over HTTPS
   TENANT_THEME   │                                   │ (cookies: session)
     KV directly  │                                   ▼
        ┌─────────▼───────────────────────────────────────────┐
        │                 apps/api  (qmenut-api)               │
        │  /trpc · /api/auth/* · /webhooks/stripe · /health    │
        └───────┬───────────────────────────┬─────────────────┘
                │ D1 (DB binding)            │ THEME_WORKER (service binding)
                ▼                            ▼
          ┌───────────┐          ┌─────────────────────────┐
          │  D1 (SQL) │          │  apps/tenant-config     │
          └───────────┘          │  writes TENANT_THEME KV │
                                 └───────────┬─────────────┘
                                             │ (same KV namespace id)
                                             ▼
                                    ┌───────────────────┐
                                    │  TENANT_THEME KV  │◄── apps/web reads here
                                    └───────────────────┘
```

Key relationships:

- **web → api**: during SSR the web worker calls the API through the `API_WORKER`
  service binding (in-process, no network hop); in the browser it falls back to HTTP.
  See `apps/web/src/lib/trpc-client.ts`.
- **web → KV**: the web worker reads tenant theme **directly** from the `TENANT_THEME`
  KV binding at SSR time (`apps/web/src/server/tenant-theme.ts`).
- **api → tenant-config**: the API never writes KV directly. Theme writes go through
  the `THEME_WORKER` service binding to `apps/tenant-config`, which is the **sole
  writer** and normalizer of `TENANT_THEME`. See
  [domains/custom-domains.md](domains/custom-domains.md) and
  [domains/theming.md](domains/theming.md).
- **shared KV id**: `apps/web/wrangler.jsonc` and `apps/tenant-config/wrangler.toml`
  bind the *same* KV namespace id on purpose — local `--persist-to ../../.wrangler-shared/state`
  is keyed by id, so both workers must agree for local dev/E2E to share state.

## The API worker in one screen

`apps/api/src/index.ts` is a single native `fetch` that dispatches by path — there is
no framework router. Wrapped in `Sentry.withSentry`:

- `OPTIONS` → CORS preflight (`applyCorsHeaders` / `createOptionsResponse`).
- `/health` → `{ status: "ok" }`.
- `/webhooks/stripe` (POST) → `handleStripeWebhook` (see [domains/billing.md](domains/billing.md)).
- `/api/auth/*` → Better Auth handler (see [domains/auth.md](domains/auth.md)).
- `/trpc` → `fetchRequestHandler` with `appRouter` and a per-request context.

Note (`apps/api/src/index.ts:45`): a fresh context (and a fresh Drizzle client) is
built **per request** via `createContext({ env, request })` — never module-global.

### tRPC composition

`apps/api/src/trpc/router.ts` assembles the whole API:

```ts
appRouter = {
  auth, health,
  menu,      // public menu (public-menu module)
  loyalty,   // public customer loyalty
  admin: { tenant, menu, branches, promotions, theme, billing, loyalty, languages, translations },
}
```

Procedure types (`apps/api/src/trpc/trpc.ts`):

- `publicProcedure` — no auth. Public menu + customer loyalty.
- `protectedProcedure` — requires a Better Auth session.
- `tenantProcedure` — `protectedProcedure` + loads the user's restaurant membership
  into `ctx.tenant = { membershipId, restaurantId, roleCode }`. Every `admin.*`
  procedure builds on this. This is the backbone of tenant isolation — see
  [domains/multi-tenancy.md](domains/multi-tenancy.md).

Per-module code lives in `apps/api/src/modules/<domain>/`: a `*.router.ts`, one file
per use case (handler), and a `*-input.schema.ts` of Zod inputs. Infrastructure
providers (Stripe, plan catalog, theme-worker client) are singletons in
`apps/api/src/lib/`.

The `AppRouter` type is re-exported to clients through `@qmenut/api/router` (the
`exports` map in `apps/api/package.json`), giving admin/web end-to-end type safety.

## Data layer

- **ORM:** Drizzle with the D1 driver. `packages/db/src/client.ts` exposes
  `createDb(d1)` — one Drizzle instance per request over the `DB` binding.
- **Schema:** split by domain in `packages/db/src/schema/` — `restaurants.ts`,
  `branches.ts`, `menu.ts`, `loyalty.ts`, `promotions.ts`, `translations.ts`,
  `billing.ts`, `customers.ts`, `auth.ts` — re-exported through `schema/index.ts`
  and `schema.ts`.
- **Access:** the repository layer `packages/db/src/repositories/*.repository.ts`
  (input-object style, always filtered by `restaurantId` / branch). Models, mappers
  and domain logic sit alongside in `models/`, `mappers/`, `domain/`.
- **Migrations:** hand-written SQL in `apps/api/migrations/` (`0001_initial_schema.sql`
  → `0006_restaurant_timezone.sql`), applied via Wrangler D1 (`db:migrate` /
  `db:migrate:local` in `apps/api/package.json`). `drizzle-kit` is a devDependency but
  there is **no `drizzle.config`** — migrations are authored by hand, not generated.
  Prices and money are stored as **integers (minor units / cents)**.

## Build & tooling

- **Package manager:** Bun (`bun.lock`). No pnpm/yarn.
- **Runner:** Turbo tasks — `build`, `dev` (persistent, uncached), `check`
  (`tsc --noEmit`), `lint`. Common commands: `bun run dev`, `bun run build`,
  `bun run check`, `bun run lint`.
- **TypeScript:** strict base at root `tsconfig.json` (`moduleResolution: bundler`,
  `noEmit`); each app/package extends it.
- **Lint/format:** flat ESLint (`eslint.config.js`) + Prettier. Conventions are
  documented in `AGENTS.md` — notably: snake-case filenames, type-only imports, one
  barrel per module, early-return over deep nesting, object params over many
  positional ones.

## Deployment (summary)

Each worker has its own Wrangler config: `apps/api/wrangler.toml`,
`apps/web/wrangler.jsonc` (Nitro-generated at build), `apps/tenant-config/wrangler.toml`,
`apps/admin/wrangler.toml`. The public menu follows a **one-web-worker-per-tenant**
model (`wrangler deploy --name qmenut-web-<tenant>`, pinned by a `TENANT_HOST` var or
resolved from the Host header). Non-secret vars live in `[vars]`; secrets stay in
platform config. See [operations/deployment.md](operations/deployment.md) (stub) and
[domains/custom-domains.md](domains/custom-domains.md) for the deploy/routing model.

## Testing

Playwright E2E in `e2e/`, run with `bun run test:e2e` (the only CI workflow,
`.github/workflows/e2e.yml`). The reset recreates local D1 + shared KV before starting
the api/admin/web workers. E2E auth uses `e2e@test.local` with fixed OTP `000000`
(`E2E_FIXED_OTP`, **local-only**, never on a deployed worker). Per `AGENTS.md`, do not
add tests unless asked.

## Key files

| Concern | Path |
|---|---|
| API entry / request dispatch | `apps/api/src/index.ts` |
| tRPC router composition | `apps/api/src/trpc/router.ts` |
| Procedure types (auth/tenant) | `apps/api/src/trpc/trpc.ts` |
| Per-request context | `apps/api/src/trpc/context.ts` |
| Drizzle client factory | `packages/db/src/client.ts` |
| Schema (by domain) | `packages/db/src/schema/` |
| Repositories | `packages/db/src/repositories/` |
| Migrations | `apps/api/migrations/` |
| Worker configs | `apps/*/wrangler.{toml,jsonc}` |
| Conventions | `AGENTS.md` |
