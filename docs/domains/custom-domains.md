# Custom domains & tenant resolution

How an incoming request becomes "this branch", and how the standalone
`tenant-config` worker owns the per-tenant KV.

## Purpose & status

✅ Complete at the application level. A branch is identified by its **host**
(`branches.customDomain`). There is no subdomain or path-slug scheme — resolution is a
straight host → branch lookup. The one open item is Cloudflare-level provisioning
(routes/certs for a new domain), which is operational config, not source.

## The routing key: `branches.customDomain`

A tenant (branch) is its host. `branches.customDomain`
(`packages/db/src/schema/branches.ts:13`) holds the hostname; resolution is an **exact
match** against it. The URL path carries only an optional `{-$locale}` segment for
i18n (`apps/web/src/app/routes/{-$locale}.*`) — never tenant identity.

Every host is first run through **`normalizeTenantHost`**
(`packages/db/src/domain/tenant.ts:22`): lowercase, trim, strip protocol/port/path via
`URL`, return the bare hostname. Read and write sides both use it, so the KV key and
the D1 lookup always agree.

## Resolution in the API (`apps/api`)

`apps/api/src/modules/tenant/resolve-tenant.ts`:

- `getRequestHostname(request)` (`resolve-tenant.ts:7`) prefers the
  **`x-forwarded-host`** header, then `host`, then the URL hostname — and strips the
  port.
- `resolveRequestTenantHost({ host, request })` (`resolve-tenant.ts:24`) lets a caller
  pass an explicit `host` (normalized), else falls back to the request.
- `resolveTenantFromRequest(...)` (`resolve-tenant.ts:34`) ties it together →
  `resolveTenantByHost` (`packages/db/src/repositories/tenant.repository.ts:14`), the
  D1 lookup that returns `{ branchId, restaurantId }` for an active, non-deleted branch.
- `apps/api/src/modules/public-menu/resolve-public-tenant.ts` is the thin public
  wrapper used by the menu router.

The reverse direction (admin needs the host *for* a branch, e.g. to write KV):
`resolveBranchHost({ restaurantId, branchId })`
(`apps/api/src/modules/admin-tenant/resolve-branch-host.ts`) authorizes via
`assertBranchAccess` and returns the branch's `customDomain`. It throws
`PRECONDITION_FAILED` when the branch has no domain yet; `resolveBranchHostOrNull` is
the non-throwing variant used by cache-invalidation callers.

## Resolution in the web app (`apps/web`)

`resolveSsrTenantHost()` (`apps/web/src/server/tenant-host.ts:27`), used during SSR,
tries three sources in order:

1. **`TENANT_HOST` worker var** — pins a worker instance to a single tenant. This is
   the production deployment model (one web worker per domain).
2. **The incoming request Host header** — `getRequestHost({ xForwardedHost: true })`.
   When custom domains route straight to a shared worker, this is what decides.
3. **`VITE_PUBLIC_MENU_HOST`** — local-dev fallback.

Config: `apps/web/wrangler.jsonc` binds `TENANT_THEME` (KV) and `API_WORKER`, and
declares the `TENANT_HOST` var (empty by default). The comments there explain that in
production a custom domain makes `TENANT_HOST` unnecessary — the Host header drives
resolution.

## The tenant-config worker (`apps/tenant-config`)

A small standalone Worker that is the **sole writer** of the `TENANT_THEME` KV
namespace. Entry `apps/tenant-config/src/index.ts` — regex-routed REST, no framework:

| Route | Methods | Notes |
|---|---|---|
| `/tenants/:host/theme` | GET / PUT / DELETE | Theme CRUD. `GET` is open; `PUT`/`DELETE` require auth. |
| `/tenants/:host/menu-version` | GET / PUT | Legacy "something changed" cache-bust signal. `PUT` stamps `Date.now()` under KV key `menuVersion:{host}`. |
| `/health` | GET | — |

Details worth knowing:

- **Auth** (`index.ts:21`, `isAuthorized`): writes require `Authorization: Bearer
  <THEME_WORKER_TOKEN>`, compared in **constant time** — both sides are SHA-256
  digested and compared with `crypto.subtle.timingSafeEqual`. Locally the token is
  `dev-token`.
- **Normalization** (`index.ts:33`, `parseThemeBody`): a `PUT` body must have a valid
  `template`, then it is run through `resolveTenantThemeConfig` and re-serialized, so
  KV **always** stores a complete config object — readers never get a partial.
- **Host** from the path is decoded and passed through `normalizeTenantHost`
  (`index.ts:144`).

The API reaches this worker through its `THEME_WORKER` service binding (see
[theming.md](theming.md)); the web app does **not** go through it — it reads the KV
namespace directly.

## Why the KV namespace id is duplicated

`apps/web/wrangler.jsonc` and `apps/tenant-config/wrangler.toml` bind the **same** KV
namespace id on purpose. Cloudflare's local storage (`--persist-to
../../.wrangler-shared/state`) is keyed by namespace **id**, so for local dev and E2E
the two workers must reference the identical id to see each other's writes. If you
create a new KV namespace, update **both** configs.

## Walkthrough: request → tenant

1. `https://carta.barlatasca.com/` hits `apps/web`.
2. `resolveSsrTenantHost` (`tenant-host.ts:27`): no `TENANT_HOST` var set → uses the
   Host header → `normalizeTenantHost` → `carta.barlatasca.com`.
3. Theme: `getTenantContext` reads `TENANT_THEME["carta.barlatasca.com"]` directly.
4. Menu data: web calls the API (`API_WORKER`); `resolveTenantByHost` matches
   `branches.customDomain = "carta.barlatasca.com"` → `{ branchId, restaurantId }`.
5. Menu rows are read filtered by both ids (see [multi-tenancy.md](multi-tenancy.md)).

## Key files

| Concern | Path |
|---|---|
| Host normalize + `ResolvedTenant` | `packages/db/src/domain/tenant.ts` |
| Host → branch/restaurant (D1) | `packages/db/src/repositories/tenant.repository.ts` |
| API-side request → host → tenant | `apps/api/src/modules/tenant/resolve-tenant.ts` |
| Public wrapper | `apps/api/src/modules/public-menu/resolve-public-tenant.ts` |
| Branch → host (reverse) | `apps/api/src/modules/admin-tenant/resolve-branch-host.ts` |
| Web SSR host resolution | `apps/web/src/server/tenant-host.ts` |
| Web worker bindings/vars | `apps/web/wrangler.jsonc` |
| Tenant-config worker (KV writer) | `apps/tenant-config/src/index.ts` |
| Tenant-config worker config | `apps/tenant-config/wrangler.toml` |

## Notes & gotchas

- **Cloudflare provisioning is out of source.** How a new `customDomain` gets a
  route/worker binding and TLS cert is deployment config, not in these files — worth
  documenting in [operations/deployment.md](../operations/deployment.md). Look at the
  `serve:*` scripts referenced by `apps/web/wrangler.jsonc` for the per-tenant dev
  pattern.
- **No subdomain/slug fallback.** If a host has no matching active branch, resolution
  returns `null` — there is no "default tenant". New public entry points must handle
  the null case.
- **Change the KV id in two places.** See above — a mismatch silently breaks local
  theme sharing.
