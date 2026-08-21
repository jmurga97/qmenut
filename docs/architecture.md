# Architecture

This page describes the contents of the monorepo, the five Cloudflare Workers that run
the system, the data layer, and the path a request takes through them.

Read this page before the other pages, then read
[Multi-tenancy](domains/multi-tenancy.md).

## Monorepo layout

The repository is a Bun `1.3.6` workspace run by Turbo (`turbo.json`). The root
`package.json` declares the workspace globs: `apps/*`, `packages/*`, and `e2e`.

### Applications

| Directory            | Package                 | Description                                                                                                                                                                         |
| -------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api`           | `@qmenut/api`           | The backend, running as a Cloudflare Worker. Serves tRPC at `/trpc`, Better Auth at `/api/auth/*`, and Stripe webhooks. Uses Drizzle over D1. Entry point: `apps/api/src/index.ts`. |
| `apps/web`           | `@qmenut/web`           | The public menu that diners see. React 19, Vite, and TanStack Start, server-rendered on a Cloudflare Worker through `@cloudflare/vite-plugin`.                                      |
| `apps/admin`         | `@qmenut/admin`         | The owner dashboard. A React 19 and Vite SPA that uses TanStack Router, deployed as a static-asset Worker with an SPA fallback.                                                     |
| `apps/tenant-config` | `@qmenut/tenant-config` | A small Worker that owns write access to the `TENANT_THEME` KV namespace. Entry point: `apps/tenant-config/src/index.ts`.                                                           |
| `apps/landing`       | `@qmenut/landing`       | The marketing site. Astro 5 with SSR, deployed with `apps/landing/wrangler.jsonc`. It is the only application with its own `deploy` script.                                         |

### Packages

| Directory              | Description                                                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `packages/db`          | Drizzle ORM: the schema (split by domain), models, mappers, domain logic, and the repository layer that performs all data access. |
| `packages/auth`        | Better Auth setup for email OTP over Drizzle. Exports a server entry point and `./client`.                                        |
| `packages/permissions` | Role and permission logic (`ROLE_CODES` and permission checks), with no dependencies. Unit-tested with `bun test`.                |
| `packages/ui`          | Shared UI: Lit web components, React wrappers, and the theme system in `theme/`. Used by web, admin, api, and tenant-config.      |

## The Workers

The system runs entirely on Cloudflare. There is no separate server. Five Workers are
connected by service bindings and one shared KV namespace.

```text
                 diners                         restaurant owners
                   │                                   │
                   ▼                                   ▼
        ┌───────────────────┐               ┌───────────────────┐
        │  apps/web (SSR)   │               │   apps/admin      │
        │  qmenut-web       │               │   (static SPA)    │
        │  Host → tenant    │               └─────────┬─────────┘
        └─────────┬─────────┘                         │ tRPC over HTTPS
      reads       │  API_WORKER (service binding)     │ (cookies: session)
   TENANT_THEME   │                                   ▼
     KV directly  │      ┌───────────────────────────────────────────┐
                  └─────►│                 apps/api  (qmenut-api)     │◄── EMAIL_WORKER
                         │  /trpc · /api/auth/* · /webhooks/stripe   │◄── IMAGE_WORKER
                         └───────┬───────────────────────────┬───────┘
                                 │ D1 (DB binding)            │ THEME_WORKER
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

        marketing visitors
                │
                ▼
        ┌───────────────────┐       External services
        │  apps/landing     │       ┌───────────────────┐  ┌───────────────────┐
        │  qmenut-landing   │       │ ming-email-worker │  │ ming-image-worker │
        │  standalone SSR   │       │ (EMAIL_WORKER)    │  │ (IMAGE_WORKER)    │
        └───────────────────┘       └───────────────────┘  └─────────┬─────────┘
                                                                  R2 + Queue + Images
```

The relationships between Workers are as follows:

- Web to API. During server-side rendering, the web Worker calls the API through the
  `API_WORKER` service binding, which stays in-process and makes no network hop.
  Browsers call same-origin `/trpc`, and the web Worker proxies those requests through
  the same binding. See `apps/web/src/app/server.ts` and
  `apps/web/src/lib/trpc-client.ts`.
- Web to KV. The web Worker reads the tenant theme directly from the `TENANT_THEME` KV
  binding at render time (`apps/web/src/server/tenant-theme.ts`).
- API to tenant-config. The API never writes to KV directly. Theme writes go through the
  `THEME_WORKER` service binding to `apps/tenant-config`, which is the only writer and
  normalizer of `TENANT_THEME`. See [Custom domains](domains/custom-domains.md) and
  [Theming](domains/theming.md).
- API to image Worker. Authenticated image negotiation and polling call `createUpload` and
  `getUpload` through the private `IMAGE_WORKER` RPC service binding. Browser bytes go directly
  to a signed private R2 staging object; the Queue-driven image Worker writes the public WebP
  result to `qmenut-media`. qmenut saves a URL only after revalidating the upload's tenant/branch
  ownership and exact manifest URL. See [Image uploads](operations/image-uploads.md).
- Shared KV ID. `apps/web/wrangler.jsonc` and `apps/tenant-config/wrangler.jsonc` bind
  the same KV namespace ID. Local storage under
  `--persist-to ../../.wrangler-shared/state` is keyed by ID, so both Workers must
  declare the same value for local development and end-to-end tests to share state.

## The API Worker

`apps/api/src/index.ts` exports a single native `fetch` handler that dispatches by path.
There is no framework router. The handler is wrapped in `Sentry.withSentry` and routes
requests as follows:

| Request                 | Handling                                                                |
| ----------------------- | ----------------------------------------------------------------------- |
| `OPTIONS`               | CORS preflight, through `applyCorsHeaders` and `createOptionsResponse`. |
| `/health`               | Returns `{ status: "ok" }`.                                             |
| `POST /webhooks/stripe` | `handleStripeWebhook`. See [Billing](domains/billing.md).               |
| `/api/auth/*`           | The Better Auth handler. See [Auth](domains/auth.md).                   |
| `/trpc`                 | `fetchRequestHandler` with `appRouter` and a per-request context.       |

A fresh context, including a fresh Drizzle client, is built for each request through
`createContext({ env, request })` (`apps/api/src/index.ts:45`). Never hold either in a
module-level variable.

### tRPC composition

`apps/api/src/trpc/router.ts` assembles the API:

```ts
appRouter = {
  auth,
  health,
  menu, // public menu (public-menu module)
  loyalty, // public customer loyalty
  admin: { tenant, menu, branches, images, promotions, theme, billing, loyalty, languages, translations },
};
```

Three procedure types are defined in `apps/api/src/trpc/trpc.ts`:

| Procedure            | Description                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `publicProcedure`    | No authentication. Used by the public menu and customer loyalty.                                                                                                         |
| `protectedProcedure` | Requires a Better Auth session.                                                                                                                                          |
| `tenantProcedure`    | Extends `protectedProcedure` and loads the user's restaurant membership into `ctx.tenant = { membershipId, restaurantId, roleCode }`. Every `admin.*` procedure uses it. |

`tenantProcedure` is the basis of tenant isolation. See
[Multi-tenancy](domains/multi-tenancy.md).

Per-module code lives in `apps/api/src/modules/<domain>/` and contains a `*.router.ts`,
one handler file per use case, and a `*-input.schema.ts` that holds the Zod inputs.
Infrastructure providers, such as Stripe, the plan catalog, and the theme-worker client,
are singletons in `apps/api/src/lib/`.

The `AppRouter` type is re-exported to clients through `@qmenut/api/router`, declared in
the `exports` map of `apps/api/package.json`. This gives admin and web end-to-end type
safety.

## Data layer

- ORM. Drizzle with the D1 driver. `packages/db/src/client.ts` exports `createDb(d1)`,
  which creates one Drizzle instance per request over the `DB` binding.
- Schema. Split by domain in `packages/db/src/schema/`: `auth.ts`, `tenancy.ts`
  (restaurants, branches, memberships, subscriptions, and languages), `menu.ts`,
  `translations.ts`, `promotions.ts`, `customers.ts`, `loyalty.ts`, `billing.ts`,
  `campaigns.ts`, `ordering.ts`, `analytics.ts`, and `operations.ts`. All of them are
  reachable from the single barrel file `schema/index.ts`; `restaurants.ts` and
  `branches.ts` re-export from `tenancy.ts`. Drizzle Kit reads only that barrel, so a
  table that is not reachable from it is not managed.
- Data access. The repository layer in `packages/db/src/repositories/*.repository.ts`
  takes input objects and always filters by `restaurantId` or branch. Models, mappers,
  and domain logic sit alongside it in `models/`, `mappers/`, and `domain/`.
- Money. Prices and other monetary values are stored as integers in minor units (cents).

Migrations are code-first from `packages/db/src/schema/`. Drizzle Kit compares the schema
with the committed snapshots in `apps/api/migrations/meta/` and generates SQL through
`db:generate`. Wrangler applies the generated files through `db:migrate` or
`db:migrate:local`. `db:check` fails when a schema change has no generated migration.

The history starts at the squashed `0000_baseline.sql`, which contains 44 tables, the
managed `v_dish_promotion_prices` view, and the immutable allergen and system-tag
catalog. D1 records applied migrations in its own `d1_migrations` table; there is no
`__drizzle_migrations` runtime table. For the full workflow, see
[Database migrations](operations/database-migrations.md).

## Build and tooling

- Package manager. Bun, with `bun.lock`. Do not use pnpm or yarn.
- Task runner. Turbo tasks: `build`, `dev` (persistent and uncached), `check`
  (`tsc --noEmit`), and `lint`. The common commands are `bun run dev`, `bun run build`,
  `bun run check`, and `bun run lint`.
- TypeScript. A strict base configuration in the root `tsconfig.json`
  (`moduleResolution: bundler`, `noEmit`) that every application and package extends.
- Lint and format. Flat ESLint config in `eslint.config.js`, plus Prettier. `AGENTS.md`
  documents the conventions, including snake-case filenames, type-only imports, one
  barrel per module, early returns instead of deep nesting, and object parameters
  instead of long positional parameter lists.

## Deployment

Each Worker has its own Wrangler configuration: `apps/api/wrangler.jsonc`,
`apps/web/wrangler.jsonc`, `apps/tenant-config/wrangler.jsonc`,
`apps/admin/wrangler.jsonc`, and `apps/landing/wrangler.jsonc`.

One `qmenut-web` Worker serves every tenant domain through Cloudflare custom domains. In
production, the request `Host` header is the only tenant selector. Development values
stay at the top level of each configuration file. Production values and non-inheritable
bindings are repeated under `[env.production]`. Deploys are manual, and secrets stay in
platform configuration.

For the complete procedure, see [Deployment](operations/deployment.md). For the routing
model, see [Custom domains](domains/custom-domains.md).

## Testing

Playwright end-to-end tests live in `e2e/` and run locally with `bun run test:e2e`. There
is no CI workflow. The reset script recreates the local D1 database and the shared KV
namespace before starting the api, tenant-config, admin, and public-menu Workers. Tests
select a tenant with the `Host` header. End-to-end authentication uses `e2e@test.local`
with the fixed OTP `000000`, supplied through `E2E_FIXED_OTP`. That variable is for local
use only and must never be set on a deployed Worker. As stated in `AGENTS.md`, do not add
tests unless you are asked to.

Local end-to-end runs require `tapas.localhost`, `fine.localhost`, `cafe.localhost`,
`her.localhost`, and `fast.localhost` to resolve to `127.0.0.1` in `/etc/hosts`. This is
mandatory because one production build of the web Worker serves every tenant and the
tests change only the `Host` header.

Two environment variables control the run: `E2E_REUSE_SERVERS=1` keeps the stack running
between iterations, and `E2E_VISUAL=1` registers the mobile template snapshot project.
Snapshot baselines include the platform in their path. Generate Linux baselines in a
Linux container, or treat the snapshots as macOS-only. See
[Testing](operations/testing.md).

## Key files

| Concern                      | Path                            |
| ---------------------------- | ------------------------------- |
| API entry point and dispatch | `apps/api/src/index.ts`         |
| tRPC router composition      | `apps/api/src/trpc/router.ts`   |
| Procedure types              | `apps/api/src/trpc/trpc.ts`     |
| Per-request context          | `apps/api/src/trpc/context.ts`  |
| Drizzle client factory       | `packages/db/src/client.ts`     |
| Schema, split by domain      | `packages/db/src/schema/`       |
| Repositories                 | `packages/db/src/repositories/` |
| Migrations                   | `apps/api/migrations/`          |
| Drizzle Kit configuration    | `apps/api/drizzle.config.ts`    |
| Worker configurations        | `apps/*/wrangler.jsonc`         |
| Code conventions             | `AGENTS.md`                     |
