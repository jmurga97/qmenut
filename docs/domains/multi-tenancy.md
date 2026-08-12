# Multi-tenancy

This page describes how restaurants are modeled and how one tenant's data is kept
separate from another's. Every feature in qmenut is scoped by these rules, so read this
page before any feature page.

## Status

Complete. qmenut runs all tenants in one D1 database. Isolation is enforced in
application code, not by separate databases. There are two independent isolation paths:
one for the public menu, keyed by request host, and one for the admin dashboard, keyed by
the signed-in user's membership.

## Data model

The tenant model has two levels: restaurant and branch.

- `restaurants` (`packages/db/src/schema/restaurants.ts:4`) is the top-level tenant
  entity. It holds `name`, `defaultLanguageCode`, `defaultCurrency`, `timezone`, the
  email-sender settings, and a `deletedAt` soft-delete column.
- `branches` (`packages/db/src/schema/branches.ts:3`) belongs to a restaurant through
  `restaurantId` and is the entity that gets a public menu. Its key column is
  `customDomain` (`branches.ts:13`), the host that maps an incoming request to the
  branch. A branch also has `planCode`, `currency`, `isActive`, and `deletedAt`. New
  tenants get the `basic` plan; the database still contains the legacy `business` value.
  The unique constraint `ux_branches_id_restaurant` on `(id, restaurantId)` lets any
  branch ID be qualified by its restaurant.

Menu content hangs off the branch and is denormalized with both IDs:

- `categories` and `dishes` (`packages/db/src/schema/menu.ts`) each carry both
  `restaurantId` and `branchId`. Menu content is therefore per branch: two branches of
  the same restaurant do not share categories or dishes.
- `dishes.categoryId` links a dish to its category. `dishes.price` is an integer in
  cents.
- Two catalogs are restaurant-scoped: `ingredients`, keyed by `restaurantId`, and `tags`,
  whose `restaurantId` is nullable. A null `restaurantId` combined with `isSystem` marks
  a global system tag. The `allergens` table is fully global.

```text
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

### Users and staff

Staff belong to a restaurant, not to a branch. The join table is `restaurantUsers`
(`restaurants.ts:18`), which holds `restaurantId`, `userId`, `roleCode` (from
`packages/permissions`), and `isActive`, with a unique constraint on
`(restaurantId, userId)`. Sign-in itself is handled by Better Auth, described in
[Auth](auth.md). This table is the authorization layer on top of it.

## Tenant isolation

There are two entry points into tenant data, and each one determines the tenant
differently.

### Public path, resolved by host

Diners are anonymous, so the tenant is derived from the request host.

- `resolveTenantByHost` (`packages/db/src/repositories/tenant.repository.ts:14`)
  normalizes the host and looks up a branch where `customDomain = host`,
  `deletedAt IS NULL`, and `isActive = true`. It returns
  `ResolvedTenant { branchId, restaurantId }` (`packages/db/src/domain/tenant.ts:3`).
- `normalizeTenantHost` (`packages/db/src/domain/tenant.ts:22`) lowercases and trims the
  value, then strips the protocol, port, and path with `URL`, leaving a bare hostname. It
  is used wherever a host is handled, on both the read and the write side.
- Every public query then filters on both `branchId` and `restaurantId`, plus `isActive`,
  so an error in host resolution cannot leak another tenant's rows. See
  `packages/db/src/repositories/public-menu.repository.ts`, where categories and dishes
  are filtered by branch and restaurant, and tags are scoped by
  `or(isNull(restaurantId), eq(restaurantId, …))`.

For the details of host resolution, including headers, Worker variables, and development
fallbacks, see [Custom domains](custom-domains.md).

### Admin path, resolved by session

Owners are authenticated, so the tenant is derived from their membership and never from a
request parameter.

- `tenantProcedure` (`apps/api/src/trpc/trpc.ts:34`) runs after `protectedProcedure`,
  calls `findMembershipByUserId`, and sets
  `ctx.tenant = { membershipId, restaurantId, roleCode }` on the context. If there is no
  active membership, it throws `FORBIDDEN`.
- Every `admin.*` procedure reads `ctx.tenant.restaurantId`. Clients never send a
  restaurant ID, so they cannot request another tenant's data.
- Any mutation that receives a `branchId` must first call `assertBranchAccess`
  (`apps/api/src/modules/admin-tenant/assert-branch-access.ts:17`). It loads the branch
  scoped to `restaurantId` and throws `NOT_FOUND`, not `FORBIDDEN`, when the branch does
  not belong to the tenant, so the API does not reveal that another tenant's branch
  exists.
- Write permissions are checked with `requirePermission(ctx.tenant, "<perm>")`
  (`apps/api/src/modules/admin-tenant/require-permission.ts`), which is backed by
  `packages/permissions`.

## Example: an admin edits a dish

1. The admin SPA calls `admin.menu.saveDish` over tRPC with session cookies.
2. `apps/api/src/index.ts:40` routes `/trpc` to the tRPC handler.
3. `protectedProcedure` (`apps/api/src/trpc/trpc.ts:19`) verifies the session, and
   `tenantProcedure` (`trpc.ts:34`) loads the membership into `ctx.tenant.restaurantId`.
4. The handler in `apps/api/src/modules/admin-menu/` calls
   `assertBranchAccess({ db, restaurantId: ctx.tenant.restaurantId, branchId })`
   (`assert-branch-access.ts:17`). A `branchId` from another tenant produces `NOT_FOUND`.
5. `requirePermission(ctx.tenant, "menu.write")` checks the role.
6. The repository writes the row, filtered by `restaurantId` and `branchId`.

## Example: a diner opens the menu

1. The request reaches `apps/web` at the restaurant's domain.
2. The web Worker resolves the host (`apps/web/src/server/tenant-host.ts`) and calls the
   API through the `API_WORKER` binding.
3. The public-menu handler calls `resolveTenantByHost` (`tenant.repository.ts:14`), which
   returns `{ branchId, restaurantId }`.
4. `public-menu.repository.ts` reads the menu, filtered by both IDs and `isActive`.
5. Nothing on this path trusts a client-supplied ID.

## Key files

| Concern                                         | Path                                                                              |
| ----------------------------------------------- | --------------------------------------------------------------------------------- |
| Restaurant, membership, and subscription schema | `packages/db/src/schema/restaurants.ts`                                           |
| Branch schema, including `customDomain`         | `packages/db/src/schema/branches.ts`                                              |
| Menu schema, scoped by branch                   | `packages/db/src/schema/menu.ts`                                                  |
| `ResolvedTenant` type and host normalization    | `packages/db/src/domain/tenant.ts`                                                |
| Host to branch and restaurant lookup            | `packages/db/src/repositories/tenant.repository.ts`                               |
| Public query isolation                          | `packages/db/src/repositories/public-menu.repository.ts`                          |
| Admin session to tenant                         | `apps/api/src/trpc/trpc.ts` (`tenantProcedure`)                                   |
| Branch access guard                             | `apps/api/src/modules/admin-tenant/assert-branch-access.ts`                       |
| Permission checks                               | `apps/api/src/modules/admin-tenant/require-permission.ts`, `packages/permissions` |

## Limitations

- One membership per user. `tenantProcedure` resolves a single membership through
  `findMembershipByUserId`. As of MVP1 there is no active-restaurant switching, so a user
  who belongs to more than one restaurant is not handled clearly. If multi-restaurant
  staff become a requirement, add an active-restaurant selector here.
- `assertBranchAccess` returns `NOT_FOUND` rather than `FORBIDDEN` so that the API does
  not disclose the existence of another tenant's branch. Keep new branch-scoped mutations
  consistent with this behavior.
- The denormalized `restaurantId` on menu rows is intentional. It provides
  defense in depth and simplifies queries, so keep writing both IDs.
