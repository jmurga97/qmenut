# Promotions 🧩

> **Stub** — Purpose + key files below; expand when needed.
> Follows the [doc template](../README.md#the-doc-template).

## Purpose & status

🟡 Admin/API complete; **public web page still uses mock data**. Owners define
promotions (percentage discount, special price, daily menu, happy hour, two-for-one)
scoped to info/branch/category/dish, with recurring windows and priority. Effective
prices are computed by a SQL view. The customer-facing promos page is **not yet wired
to the live API** — this is the main gap.

## Data model

`packages/db/src/schema/promotions.ts` — `promotions` (type, scope, recurring window,
priority, start/end), `promotion_targets`, and the SQL view `v_dish_promotion_prices`
that computes effective per-dish prices.

## Backend

- Admin: `apps/api/src/modules/admin-promotions/` — `admin-promotions.router.ts`,
  `save-promotion.ts`, `promotion-input.schema.ts`. Procedures: `list`, `get`,
  `create`, `update`, `remove`. `tenantProcedure`.
- Repositories: `packages/db/src/repositories/admin-promotions.repository.ts`,
  `promotions.repository.ts`; model `packages/db/src/models/promotion.ts`; domain
  `packages/db/src/domain/promotions.ts`.

## Frontend

- Admin routes: `apps/admin/src/app/routes/_auth.promotions.tsx`,
  `_auth.promotions.index.tsx`, `_auth.promotions.new.tsx`,
  `_auth.promotions.$promotionId.tsx`.
- Public — **MOCK**: `apps/web/src/app/routes/{-$locale}.promos.tsx` renders
  `apps/web/src/features/promos/`, backed by
  `apps/web/src/features/promos/mock/mock-promos-content.ts`.

## Key files

| Concern | Path |
|---|---|
| Promotions schema + price view | `packages/db/src/schema/promotions.ts` |
| Admin router + handlers | `apps/api/src/modules/admin-promotions/` |
| Repositories / model / domain | `packages/db/src/repositories/{admin-promotions,promotions}.repository.ts`, `.../models/promotion.ts`, `.../domain/promotions.ts` |
| Admin UI | `apps/admin/src/app/routes/_auth.promotions.*` |
| Public UI (mock) | `apps/web/src/features/promos/` |

## Notes & gotchas

- **Wire the public promos page to the real API** (replace `mock/mock-promos-content.ts`)
  to close MVP1 — this is the tracked gap.
- Effective public prices should come from `v_dish_promotion_prices`, not recomputed
  in the client.
