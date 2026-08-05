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

The reverse direction (admin needs the host _for_ a branch, e.g. to write KV):
`resolveBranchHost({ restaurantId, branchId })`
(`apps/api/src/modules/admin-tenant/resolve-branch-host.ts`) authorizes via
`assertBranchAccess` and returns the branch's `customDomain`. It throws
`PRECONDITION_FAILED` when the branch has no domain yet; `resolveBranchHostOrNull` is
the non-throwing variant used by cache-invalidation callers.

## Resolution in the web app (`apps/web`)

`resolveSsrTenantHost()` (`apps/web/src/server/tenant-host.ts`), used inside TanStack
Start, reads `getRequestHost()`, normalizes it, and uses it as the
only production tenant source. In development only, bare `localhost` and LAN IPs use
`VITE_PUBLIC_MENU_HOST` or the seeded `fine.localhost` fallback; tenant-shaped hosts
such as `tapas.localhost` continue through the normal Host-header path.

The outer edge-cache wrapper uses `resolveRequestTenantHost(request)` instead because
TanStack's request context does not exist yet. Neither resolver trusts
`X-Forwarded-Host`, preventing tenant confusion and cache poisoning.

Config: `apps/web/wrangler.jsonc` binds `TENANT_THEME` (KV) and `API_WORKER` (service
binding to `qmenut-api`). There is no tenant-pinning worker var.

## The tenant-config worker (`apps/tenant-config`)

A small standalone Worker that is the **sole writer** of the `TENANT_THEME` KV
namespace. Entry `apps/tenant-config/src/index.ts` — regex-routed REST, no framework:

| Route                         | Methods            | Notes                                                                                                      |
| ----------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------- |
| `/tenants/:host/theme`        | GET / PUT / DELETE | Theme CRUD. `GET` is open; `PUT`/`DELETE` require auth.                                                    |
| `/tenants/:host/menu-version` | GET / PUT          | Legacy "something changed" cache-bust signal. `PUT` stamps `Date.now()` under KV key `menuVersion:{host}`. |
| `/health`                     | GET                | —                                                                                                          |

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

`apps/web/wrangler.jsonc` and `apps/tenant-config/wrangler.jsonc` bind the **same** KV
namespace on purpose. Cloudflare's local storage (`--persist-to
../../.wrangler-shared/state`) is keyed by namespace **preview id**, so local dev and
E2E use the same `preview_id` while production uses the real shared `id`. If you
create a new KV namespace, update the production `id` in **both** configs.

## Walkthrough: request → tenant

1. `https://carta.barlatasca.com/` hits `apps/web`.
2. `resolveSsrTenantHost` (`tenant-host.ts`): uses the Host header →
   `normalizeTenantHost` → `carta.barlatasca.com`.
3. Theme: `getTenantContext` reads `TENANT_THEME["carta.barlatasca.com"]` directly.
4. Menu data: web calls the API (`API_WORKER`); `resolveTenantByHost` matches
   `branches.customDomain = "carta.barlatasca.com"` → `{ branchId, restaurantId }`.
5. Menu rows are read filtered by both ids (see [multi-tenancy.md](multi-tenancy.md)).

## Key files

| Concern                           | Path                                                        |
| --------------------------------- | ----------------------------------------------------------- |
| Host normalize + `ResolvedTenant` | `packages/db/src/domain/tenant.ts`                          |
| Host → branch/restaurant (D1)     | `packages/db/src/repositories/tenant.repository.ts`         |
| API-side request → host → tenant  | `apps/api/src/modules/tenant/resolve-tenant.ts`             |
| Public wrapper                    | `apps/api/src/modules/public-menu/resolve-public-tenant.ts` |
| Branch → host (reverse)           | `apps/api/src/modules/admin-tenant/resolve-branch-host.ts`  |
| Web SSR host resolution           | `apps/web/src/server/tenant-host.ts`                        |
| Web worker bindings/vars          | `apps/web/wrangler.jsonc`                                   |
| Tenant-config worker (KV writer)  | `apps/tenant-config/src/index.ts`                           |
| Tenant-config worker config       | `apps/tenant-config/wrangler.jsonc`                          |

## Notes & gotchas

- **Cloudflare provisioning is out of source.** How a new `customDomain` gets a
  route/worker binding and TLS cert is deployment config, not in these files — attach
  each new custom domain to the single `qmenut-web` worker. See
  [operations/deployment.md](../operations/deployment.md).
- **No subdomain/slug fallback.** If a host has no matching active branch, resolution
  returns `null` — there is no "default tenant". New public entry points must handle
  the null case.
- **Change the production KV id in two places.** Keep the shared `preview_id` stable
  for local theme sharing.
