# Custom domains and tenant resolution

This page describes how an incoming request is resolved to a branch, and how the
standalone `tenant-config` Worker owns the per-tenant KV namespace.

## Status

Complete at the application level. A branch is identified by its host, stored in
`branches.customDomain`. There is no subdomain or path-slug scheme; resolution is a direct
host-to-branch lookup. The remaining work is Cloudflare-level provisioning, such as routes
and certificates for a new domain, which is operational configuration rather than source
code.

## The routing key

A tenant, which is a branch, is identified by its host.
`branches.customDomain` (`packages/db/src/schema/branches.ts:13`) holds the hostname, and
resolution is an exact match against it. The URL path carries only an optional
`{-$locale}` segment for internationalization
(`apps/web/src/app/routes/{-$locale}.*`); it never carries tenant identity.

Every host is first passed through `normalizeTenantHost`
(`packages/db/src/domain/tenant.ts:22`), which lowercases and trims the value, strips the
protocol, port, and path with `URL`, and returns the bare hostname. The read and write
sides both use it, so the KV key and the D1 lookup always agree.

## Resolution in the API

The API resolvers are in `apps/api/src/modules/tenant/resolve-tenant.ts`:

- `getRequestHostname(request)` (`resolve-tenant.ts:7`) prefers the `x-forwarded-host`
  header, then `host`, then the URL hostname, and strips the port.
- `resolveRequestTenantHost({ host, request })` (`resolve-tenant.ts:24`) lets a caller
  pass an explicit, normalized `host`, and otherwise falls back to the request.
- `resolveTenantFromRequest(...)` (`resolve-tenant.ts:34`) combines the two and calls
  `resolveTenantByHost` (`packages/db/src/repositories/tenant.repository.ts:14`), the D1
  lookup that returns `{ branchId, restaurantId }` for an active, non-deleted branch.
- `apps/api/src/modules/public-menu/resolve-public-tenant.ts` is the thin public wrapper
  used by the menu router.

The admin sometimes needs the reverse: the host for a given branch, for example to write
to KV. `resolveBranchHost({ restaurantId, branchId })`
(`apps/api/src/modules/admin-tenant/resolve-branch-host.ts`) authorizes the branch through
`assertBranchAccess` and returns its `customDomain`. It throws `PRECONDITION_FAILED` when
the branch has no domain yet. `resolveBranchHostOrNull` is the non-throwing variant used
by cache-invalidation callers.

## Resolution in the web application

`resolveSsrTenantHost()` (`apps/web/src/server/tenant-host.ts`) runs inside TanStack
Start. It reads `getRequestHost()`, normalizes it, and uses the result as the only
production tenant source. In development only, bare `localhost` and LAN IP addresses fall
back to `VITE_PUBLIC_MENU_HOST` or to the seeded `fine.localhost` host. Tenant-shaped
hosts such as `tapas.localhost` continue through the normal `Host` header path.

The outer edge-cache wrapper uses `resolveRequestTenantHost(request)` instead, because the
TanStack request context does not exist at that point. Neither resolver trusts
`X-Forwarded-Host`, which prevents tenant confusion and cache poisoning.

`apps/web/wrangler.jsonc` binds `TENANT_THEME` as a KV namespace and `API_WORKER` as a
service binding to `qmenut-api`. There is no tenant-pinning Worker variable.

## The tenant-config Worker

`apps/tenant-config` is a small standalone Worker and the only writer of the
`TENANT_THEME` KV namespace. Its entry point, `apps/tenant-config/src/index.ts`, routes
REST requests with regular expressions and uses no framework.

| Route                         | Methods          | Description                                                                                 |
| ----------------------------- | ---------------- | ------------------------------------------------------------------------------------------- |
| `/tenants/:host/theme`        | GET, PUT, DELETE | Theme CRUD. `GET` is open; `PUT` and `DELETE` require authorization.                        |
| `/tenants/:host/menu-version` | GET, PUT         | Cache-invalidation signal. `PUT` stores `Date.now()` under the KV key `menuVersion:{host}`. |
| `/health`                     | GET              | Health check.                                                                               |

Three details are worth knowing:

- Authorization. Writes require an `Authorization: Bearer <THEME_WORKER_TOKEN>` header
  (`index.ts:21`, `isAuthorized`). Both sides are SHA-256 digested and compared with
  `crypto.subtle.timingSafeEqual`, so the comparison runs in constant time. The local
  token is `dev-token`.
- Normalization. A `PUT` body must contain a valid `template` (`index.ts:33`,
  `parseThemeBody`). The body is then passed through `resolveTenantThemeConfig` and
  re-serialized, so KV always stores a complete configuration object and readers never
  receive a partial one.
- Host handling. The host from the path is decoded and passed through
  `normalizeTenantHost` (`index.ts:144`).

The API reaches this Worker through its `THEME_WORKER` service binding; see
[Theming](theming.md). The web application does not go through it and reads the KV
namespace directly.

Note: `menuVersion` is a legacy key name. It represents all public-content changes, not
only menu rows. See [Performance and caching](../operations/performance-and-caching.md).

## Why the KV namespace ID is duplicated

`apps/web/wrangler.jsonc` and `apps/tenant-config/wrangler.jsonc` bind the same KV
namespace deliberately. Cloudflare's local storage,
`--persist-to ../../.wrangler-shared/state`, is keyed by the namespace preview ID, so
local development and end-to-end tests use the same `preview_id` while production uses the
real shared `id`. If you create a new KV namespace, update the production `id` in both
configuration files.

## Example: from a request to a tenant

1. A request for `https://carta.barlatasca.com/` reaches `apps/web`.
2. `resolveSsrTenantHost` (`tenant-host.ts`) reads the `Host` header and passes it to
   `normalizeTenantHost`, which returns `carta.barlatasca.com`.
3. `getTenantContext` reads `TENANT_THEME["carta.barlatasca.com"]` for the theme.
4. For menu data, the web Worker calls the API through `API_WORKER`, and
   `resolveTenantByHost` matches `branches.customDomain = "carta.barlatasca.com"` and
   returns `{ branchId, restaurantId }`.
5. Menu rows are read filtered by both IDs. See [Multi-tenancy](multi-tenancy.md).

## Key files

| Concern                                    | Path                                                        |
| ------------------------------------------ | ----------------------------------------------------------- |
| Host normalization and `ResolvedTenant`    | `packages/db/src/domain/tenant.ts`                          |
| Host to branch and restaurant lookup in D1 | `packages/db/src/repositories/tenant.repository.ts`         |
| API-side request to host to tenant         | `apps/api/src/modules/tenant/resolve-tenant.ts`             |
| Public wrapper                             | `apps/api/src/modules/public-menu/resolve-public-tenant.ts` |
| Branch to host lookup                      | `apps/api/src/modules/admin-tenant/resolve-branch-host.ts`  |
| Web host resolution during rendering       | `apps/web/src/server/tenant-host.ts`                        |
| Web Worker bindings and variables          | `apps/web/wrangler.jsonc`                                   |
| Tenant-config Worker                       | `apps/tenant-config/src/index.ts`                           |
| Tenant-config Worker configuration         | `apps/tenant-config/wrangler.jsonc`                         |

## Limitations

- Cloudflare provisioning is not in source control. Attaching a new `customDomain` to a
  route and issuing its TLS certificate is deployment configuration. Attach each new
  custom domain to the single `qmenut-web` Worker. See
  [Deployment](../operations/deployment.md).
- There is no subdomain or slug fallback. If a host has no matching active branch,
  resolution returns `null`; there is no default tenant. New public entry points must
  handle the `null` case.
- Changing the production KV ID requires editing two files. Keep the shared `preview_id`
  stable so local theme state continues to be shared.
