# Multi-tenancy

How restaurants are modelled and, crucially, **how one tenant's data is kept
separate from another's**. Every feature in qmenut is scoped by the rules in this
doc — read it before any feature doc.

## Purpose & status

✅ Complete. qmenut runs all tenants in **one D1 database**; isolation is enforced in
application code, not by separate databases. There are two independent isolation
paths — one for the public menu (keyed by host) and one for the admin dashboard
(keyed by the logged-in user's membership).

## The model: restaurant → branch

Two levels.

- **`restaurants`** (`packages/db/src/schema/restaurants.ts:4`) is the top tenant
  entity: `name`, `defaultLanguageCode`, `defaultCurrency`, `timezone`, email-sender
  settings, and a soft-delete `deletedAt`.
- **`branches`** (`packages/db/src/schema/branches.ts:3`) belongs to a restaurant
  (`restaurantId`) and is **the unit that actually gets a public menu**. Its key
  field is **`customDomain`** (`branches.ts:13`) — the host that maps an incoming
  request to this branch. A branch also has `planCode` (`basic` | `business`),
  `currency`, `isActive`, and a soft-delete `deletedAt`. There is a unique constraint
  `ux_branches_id_restaurant` on `(id, restaurantId)` so a branch id can always be
  safely qualified by its restaurant.

Menu content hangs off the branch, **denormalized with both ids**:

- `categories` and `dishes` (`packages/db/src/schema/menu.ts`) each carry **both
  `restaurantId` and `branchId`**. Menu content is therefore per-branch — two
  branches of the same restaurant do not share categories or dishes.
- `dishes.categoryId` links a dish to its category; `dishes.price` is an integer
  (cents).
- Restaurant-scoped catalogs: `ingredients` (`restaurantId`) and `tags`
  (`restaurantId` nullable — a null restaurant + `isSystem` marks a global/system
  tag). `allergens` are fully global.

```
restaurants (tenant root)
 ├─ restaurant_users        (membership: user ↔ restaurant + role)
 ├─ restaurant_languages    (enabled menu languages)
 ├─ branch_subscriptions    (Stripe subscription per branch)
 ├─ ingredients, tags       (restaurant-scoped catalogs)
 └─ branches                (customDomain → public menu)
     ├─ categories          (restaurantId + branchId)
     │   └─ dishes          (restaurantId + branchId + categoryId)
     │       ├─ dish_variant_groups → dish_variant_options
     │       ├─ dish_extras (→ ingredients)
     │       ├─ dish_tags (→ tags), dish_allergens (→ allergens)
     │       └─ dish_availability_windows
     ├─ branch_photos, branch_schedules
```

## Users & staff

Staff belong to a **restaurant**, not to a branch. The join table is
`restaurantUsers` (`restaurants.ts:18`): `restaurantId`, `userId`, `roleCode` (from
`packages/permissions`), `isActive`, unique on `(restaurantId, userId)`. Login itself
is Better Auth (see [auth.md](auth.md)); this table is the authorization layer on top.

## Tenant isolation — the two paths

This is the heart of the system. There are two entry points into tenant data, and
each resolves "which tenant" a different way.

### 1. Public path — resolved by host

Diners are anonymous; the tenant is derived from the **request host**.

- `resolveTenantByHost` (`packages/db/src/repositories/tenant.repository.ts:14`)
  normalizes the host and looks up a branch where
  `customDomain = host AND deletedAt IS NULL AND isActive = true`, returning
  `ResolvedTenant { branchId, restaurantId }` (`packages/db/src/domain/tenant.ts:3`).
- `normalizeTenantHost` (`packages/db/src/domain/tenant.ts:22`) lowercases, trims, and
  strips protocol/port/path via `URL`, leaving a bare hostname. It is used everywhere
  a host is handled, on both the read and write sides.
- Every public query then filters on **both** `branchId` and `restaurantId` (plus
  `isActive`), so even a bug in host resolution cannot leak another tenant's rows. See
  `packages/db/src/repositories/public-menu.repository.ts` (categories/dishes filtered
  by branch + restaurant; tags scoped by `or(isNull(restaurantId), eq(restaurantId, …))`).

Host resolution mechanics (headers, worker vars, dev fallbacks) are their own topic —
see [custom-domains.md](custom-domains.md).

### 2. Admin path — resolved by session

Owners are authenticated; the tenant is derived from **their membership**, never from
a request parameter.

- `tenantProcedure` (`apps/api/src/trpc/trpc.ts:34`) runs after `protectedProcedure`,
  calls `findMembershipByUserId`, and puts
  `ctx.tenant = { membershipId, restaurantId, roleCode }` on the context. If there is
  no active membership it throws `FORBIDDEN`.
- Every `admin.*` procedure reads `ctx.tenant.restaurantId` — clients never send a
  restaurant id, so they cannot ask for another tenant's data.
- Any mutation that receives a `branchId` must pass through **`assertBranchAccess`**
  (`apps/api/src/modules/admin-tenant/assert-branch-access.ts:17`) first. It loads the
  branch scoped to `restaurantId` and throws **`NOT_FOUND`** (deliberately not
  `FORBIDDEN`) when the branch isn't the tenant's — so the API never reveals that
  another tenant's branch exists.
- Write permissions are checked with `requirePermission(ctx.tenant, "<perm>")`
  (`apps/api/src/modules/admin-tenant/require-permission.ts`), backed by
  `packages/permissions`.

## Walkthrough: an admin edits a dish

1. Admin SPA calls `admin.menu.saveDish` over tRPC with session cookies.
2. `apps/api/src/index.ts:40` routes `/trpc` → `tenantProcedure`.
3. `apps/api/src/trpc/trpc.ts:19` `protectedProcedure` verifies the session;
   `trpc.ts:34` `tenantProcedure` loads the membership → `ctx.tenant.restaurantId`.
4. The handler in `apps/api/src/modules/admin-menu/` calls
   `assertBranchAccess({ db, restaurantId: ctx.tenant.restaurantId, branchId })`
   (`assert-branch-access.ts:17`) — cross-tenant `branchId` ⇒ `NOT_FOUND`.
5. `requirePermission(ctx.tenant, "menu.write")` gates the write by role.
6. The repository writes, always filtered by `restaurantId` + `branchId`.

## Walkthrough: a diner opens the menu

1. Request hits `apps/web` at the restaurant's domain.
2. The web worker resolves the host (`apps/web/src/server/tenant-host.ts`) and calls
   the API via the `API_WORKER` binding.
3. The public-menu handler calls `resolveTenantByHost`
   (`tenant.repository.ts:14`) → `{ branchId, restaurantId }`.
4. `public-menu.repository.ts` reads the menu filtered by both ids + `isActive`.
5. Nothing on this path trusts a client-supplied id.

## Key files

| Concern | Path |
|---|---|
| Restaurant / membership / subscriptions schema | `packages/db/src/schema/restaurants.ts` |
| Branch schema (`customDomain`) | `packages/db/src/schema/branches.ts` |
| Menu schema (branch-scoped) | `packages/db/src/schema/menu.ts` |
| `ResolvedTenant` type + host normalize | `packages/db/src/domain/tenant.ts` |
| Host → branch/restaurant | `packages/db/src/repositories/tenant.repository.ts` |
| Public query isolation | `packages/db/src/repositories/public-menu.repository.ts` |
| Admin session → tenant | `apps/api/src/trpc/trpc.ts` (`tenantProcedure`) |
| Branch access guard | `apps/api/src/modules/admin-tenant/assert-branch-access.ts` |
| Permission checks | `apps/api/src/modules/admin-tenant/require-permission.ts`, `packages/permissions` |

## Notes & gotchas

- **Single membership per user (verify).** `tenantProcedure` resolves *one*
  membership via `findMembershipByUserId`. There is no active-restaurant switching in
  the code as of MVP1 — a user who belongs to multiple restaurants is not clearly
  handled. If multi-restaurant staff become a requirement, this is the place to add an
  active-restaurant selector.
- **`NOT_FOUND`, not `FORBIDDEN`.** The choice in `assertBranchAccess` is intentional
  (avoids leaking cross-tenant existence). Keep new branch-scoped mutations consistent
  with it.
- **Denormalized `restaurantId` on menu rows** is a deliberate defense-in-depth /
  query-simplicity choice, not an accident — keep writing both ids.
