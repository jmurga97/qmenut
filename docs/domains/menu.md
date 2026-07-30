# Menu management 🧩

> **Stub** — Purpose + key files below; expand the walkthrough sections when needed.
> Follows the [doc template](../README.md#the-doc-template).

## Purpose & status

✅ Complete. The core CRUD of qmenut: categories and dishes (branch-scoped), plus
dish composition — variant groups/options, extras (ingredients), tags, allergens, and
availability windows. Prices are integers (cents). The same data is read back for the
public menu through a separate read path.

## Data model

`packages/db/src/schema/menu.ts` — `categories`, `dishes`,
`dish_availability_windows`, `dish_variant_groups`, `dish_variant_options`,
`ingredients`, `dish_extras`, `tags`, `dish_tags`, `allergens`, `dish_allergens`.
`categories`/`dishes` carry both `restaurantId` and `branchId` (see
[multi-tenancy.md](multi-tenancy.md)).

## Backend

- Admin: `apps/api/src/modules/admin-menu/` — `admin-menu.router.ts` +
  `save-category.ts`, `save-dish.ts`, `save-dish-relations.ts`, `get-menu-catalog.ts`,
  `get-dish-detail.ts`, `menu-input.schema.ts`. `tenantProcedure`; branch writes go
  through `assertBranchAccess`.
- Repositories: `packages/db/src/repositories/admin-categories.repository.ts`,
  `admin-dishes.repository.ts`, `admin-menu-taxonomy.repository.ts`.
- Public read: `apps/api/src/modules/public-menu/` (`publicData` procedure,
  `get-public-menu.ts`, `sanitize-description.ts`) + `public-menu.repository.ts`.

## Frontend

- Admin routes: `apps/admin/src/app/routes/_auth.menu.tsx`, `_auth.menu.index.tsx`,
  `_auth.menu.categories.new.tsx`, `_auth.menu.categories.$categoryId.tsx`,
  `_auth.menu.dishes.new.tsx`, `_auth.menu.dishes.$dishId.tsx`.
- Public: `apps/web/src/features/menu/` (real tRPC via
  `api/public-menu-query-options.ts`).

## Key files

| Concern | Path |
|---|---|
| Menu schema | `packages/db/src/schema/menu.ts` |
| Admin menu router + handlers | `apps/api/src/modules/admin-menu/` |
| Admin repositories | `packages/db/src/repositories/admin-{categories,dishes,menu-taxonomy}.repository.ts` |
| Public menu read | `apps/api/src/modules/public-menu/`, `packages/db/src/repositories/public-menu.repository.ts` |
| Admin UI | `apps/admin/src/app/routes/_auth.menu.*` |
| Public UI | `apps/web/src/features/menu/` |

## Notes & gotchas

- Variant option `priceDelta` and ingredient/extra prices are integer cents.
- Public pricing is affected by promotions via the `v_dish_promotion_prices` SQL view —
  see [promotions.md](promotions.md).
