# Menu management

This page describes the menu content model: categories and dishes, scoped to a branch,
and dish composition through variant groups, extras, tags, allergens, and availability
windows.

This page is partial. It states the purpose, the structure, and the key files, but does
not yet contain a full walkthrough.

## Status

Complete. Prices are stored as integers in cents. The same data is read back for the
public menu through a separate read path.

## Data model

The schema is `packages/db/src/schema/menu.ts`, which defines `categories`, `dishes`,
`dish_availability_windows`, `dish_variant_groups`, `dish_variant_options`, `ingredients`,
`dish_extras`, `tags`, `dish_tags`, `allergens`, and `dish_allergens`.

`categories` and `dishes` carry both `restaurantId` and `branchId`. See
[Multi-tenancy](multi-tenancy.md).

## Backend

- Admin. `apps/api/src/modules/admin-menu/` contains `admin-menu.router.ts` and the
  handlers `save-category.ts`, `save-dish.ts`, `save-dish-relations.ts`,
  `get-menu-catalog.ts`, and `get-dish-detail.ts`, plus `menu-input.schema.ts`. The router
  uses `tenantProcedure`, and branch writes go through `assertBranchAccess`.
- Repositories. `packages/db/src/repositories/admin-categories.repository.ts`,
  `admin-dishes.repository.ts`, and `admin-menu-taxonomy.repository.ts`.
- Public read path. `apps/api/src/modules/public-menu/` contains the `publicData`
  procedure, `get-public-menu.ts`, and `sanitize-description.ts`, backed by
  `public-menu.repository.ts`.

## Frontend

- Admin routes. `apps/admin/src/app/routes/_auth.menu.tsx`, `_auth.menu.index.tsx`,
  `_auth.menu.categories.new.tsx`, `_auth.menu.categories.$categoryId.tsx`,
  `_auth.menu.dishes.new.tsx`, and `_auth.menu.dishes.$dishId.tsx`.
- Public. `apps/web/src/features/menu/`, which calls the live tRPC API through
  `api/public-menu-query-options.ts`.

## Key files

| Concern                        | Path                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------- |
| Menu schema                    | `packages/db/src/schema/menu.ts`                                                              |
| Admin menu router and handlers | `apps/api/src/modules/admin-menu/`                                                            |
| Admin repositories             | `packages/db/src/repositories/admin-{categories,dishes,menu-taxonomy}.repository.ts`          |
| Public menu read path          | `apps/api/src/modules/public-menu/`, `packages/db/src/repositories/public-menu.repository.ts` |
| Admin UI                       | `apps/admin/src/app/routes/_auth.menu.*`                                                      |
| Public UI                      | `apps/web/src/features/menu/`                                                                 |

## Limitations

- Variant option `priceDelta` values and ingredient and extra prices are integers in
  cents.
- Public pricing is affected by promotions through the `v_dish_promotion_prices` SQL
  view. See [Promotions](promotions.md).
