# Promotions

This page describes how owners define promotions and how effective prices are computed
for the public menu.

This page is partial. It states the purpose, the structure, and the key files, but does
not yet contain a full walkthrough.

## Status

The admin dashboard and the API are complete. The public promotions page still uses mock
data, which is the main gap.

Owners define promotions of five types, percentage discount, special price, daily menu,
happy hour, and two-for-one, scoped to the restaurant information, a branch, a category,
or a dish, with recurring windows and a priority. Effective prices are computed by a SQL
view.

## Data model

The schema is `packages/db/src/schema/promotions.ts`. It defines `promotions`, which holds
the type, the scope, the recurring window, the priority, and the start and end dates;
`promotion_targets`; and the SQL view `v_dish_promotion_prices`, which computes the
effective price for each dish.

## Backend

- Admin. `apps/api/src/modules/admin-promotions/` contains
  `admin-promotions.router.ts`, `save-promotion.ts`, and `promotion-input.schema.ts`. The
  procedures are `list`, `get`, `create`, `update`, and `remove`, all built on
  `tenantProcedure`.
- Repositories, model, and domain logic.
  `packages/db/src/repositories/admin-promotions.repository.ts` and
  `promotions.repository.ts`, the model `packages/db/src/models/promotion.ts`, and the
  domain logic in `packages/db/src/domain/promotions.ts`.

## Frontend

- Admin routes. `apps/admin/src/app/routes/_auth.promotions.tsx`,
  `_auth.promotions.index.tsx`, `_auth.promotions.new.tsx`, and
  `_auth.promotions.$promotionId.tsx`.
- Public. `apps/web/src/app/routes/{-$locale}.promos.tsx` renders
  `apps/web/src/features/promos/`, which is currently backed by
  `apps/web/src/features/promos/mock/mock-promos-content.ts`.

## Key files

| Concern                                    | Path                                                                                                                              |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Promotions schema and effective-price view | `packages/db/src/schema/promotions.ts`                                                                                            |
| Admin router and handlers                  | `apps/api/src/modules/admin-promotions/`                                                                                          |
| Repositories, model, and domain logic      | `packages/db/src/repositories/{admin-promotions,promotions}.repository.ts`, `.../models/promotion.ts`, `.../domain/promotions.ts` |
| Admin UI                                   | `apps/admin/src/app/routes/_auth.promotions.*`                                                                                    |
| Public UI, currently mock-backed           | `apps/web/src/features/promos/`                                                                                                   |

## Limitations

- The public promotions page must be wired to the live API, replacing
  `mock/mock-promos-content.ts`. This is the tracked gap that closes MVP1.
- Effective public prices must come from `v_dish_promotion_prices`. Do not recompute them
  in the client.
