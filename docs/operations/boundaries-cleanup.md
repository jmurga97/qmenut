# Boundaries cleanup (completed 2026-09-11)

All eight steps and activation are complete. The original 73 warnings are resolved;
`boundaries/*` now fails as errors and `bun run lint` rejects warnings. The sections below
retain the implementation plan and original inventory.

The menu provider is supplied by the app through `PublicRouteLayout.contentProvider` and
mounted inside the layout context, preserving currency and tenant access. The broad
feature-entrypoint allow policy was removed because it bypassed the layer restrictions.
Fixtures now match the diagnostic to its own file; the invalid app-private-internals probe
was replaced by a shared→feature SEO import (app is allowed to compose feature internals).

Verification: strict lint, all 11 check tasks, all 5 build tasks, 39 unit tests, all 5 negative
fixtures, and 8 Playwright checks (auth setup plus menu, highlights, contact and legal routes).

For easy scalability and maintenance, almost all code lives inside `features/`. Each feature
contains everything specific to that domain; `app/` is only routes, composition and
bootstrap; `shared/` is only what two or more features need; `lib/` wraps clients and
contracts. Nothing shared reaches back up into a feature, and no feature reaches sideways
into another. The three escape hatches, in order of preference:

1. **Shared domain core** — types/mappers consumed by several features move to
   `shared/<domain>/`; features keep only their specific logic.
2. **Composition at the app layer** — pages or shells that stitch widgets from several
   features belong in `app/`, which is allowed to import features.
3. **Explicit approved exceptions** — an edge the model genuinely needs (e.g. type-only
   tRPC contracts) is encoded as a documented policy in `.oxlintrc.jsonc`, never as a
   one-off `oxlint-disable` sprinkled through the code.

## Current structure vs. violations (inventory)

Grouped by root cause; counts are import statements, not files.

| #   | Cluster                                                                                                               | Edges | Root cause                                                                                |
| --- | --------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------- |
| A   | `AppRouter` type imported by 11 features/shared + admin lib                                                           | 12    | `inferRouterOutputs<AppRouter>` re-derived in every consumer                              |
| B   | features + shared import `~/app/store/*` (branch/language/shell zustand stores)                                       | 10    | app-wide state lives in the app layer, but is consumed by features and shared             |
| C   | `features/dashboard` composes analytics/billing/exchange-rates/loyalty/menu                                           | 14    | dashboard is composition, not a domain feature                                            |
| D   | `shared/components/shell/admin-shell.tsx` (the app chrome) imports app stores, features/languages, features/auth      | 5     | the shell is bootstrap/composition, misplaced in shared                                   |
| E   | `shared` imports `~/app/fonts/font-css`                                                                               | 1     | font catalog lives in app, consumed by shared shell + server                              |
| F   | web `menu` ↔ `promos` mapper coupling (both directions)                                                               | 17    | two features share one domain core (public menu data model + mappers) with no shared home |
| G   | `contact`, `legal` hooks/mappers import menu api query options and types                                              | 4     | same shared core, consumed sideways                                                       |
| H   | `contact-page` embeds `InstallCard` (install) and `LegalLinksNav` (legal)                                             | 2     | page-level composition done inside a feature                                              |
| I   | web `shared` (public-route-layout, menu-route-header, analytics-bootstrap, use-public-tenant) imports `features/menu` | 4     | shared layout consumes menu feature internals                                             |
| J   | web `lib` imports feature types (`DishOpenSource`, `InstallMode`)                                                     | 2     | analytics event contracts defined inside features                                         |
| K   | `TenantContext` type imported across server ↔ shared ↔ feature                                                        | 3     | server-owned type consumed by shared and features                                         |
| L   | admin `loyalty` → `menu`/`theme`, `promotions` → `menu`, `menu` → `languages`                                         | 5     | admin domain query options consumed cross-feature                                         |
| M   | `shared` imports `~/server/tenant-theme` (web use-tenant-context)                                                     | 1     | same shared core as K                                                                     |

Total: 73. Clusters are ordered by cheapest structural fix; several resolve together.

## Target structure

### apps/web/src

```plaintext
  📂 apps/web/src
├── 📂 app                  # Application layer: routes, bootstrap, route composition
│   ├── 📂 routes           # TanStack Router route files (page composition happens here)
│   ├── 📄 client.tsx       # Client bootstrap
│   ├── 📄 register-sw.ts   # Service worker registration
│   ├── 📄 router.tsx       # Router configuration
│   └── 📄 server.ts        # SSR entry (imports app/ + server/)
│
├── 📂 features             # Feature-based modules (vertical slices)
│   ├── 📂 contact          # contact page + reviews
│   ├── 📂 install          # PWA install prompt (exports the InstallCard via its public api/)
│   ├── 📂 legal            # legal notice + privacy pages
│   ├── 📂 loyalty          # loyalty program pages
│   ├── 📂 menu             # menu page, its own mappers and SEO builders
│   ├── 📂 offline          # offline page
│   └── 📂 promos           # highlights page, its own content mappers
│
├── 📂 lib                  # Reusable libraries (wraps external packages + contracts)
│   ├── 📂 analytics        # event catalog (owns its payload types) + posthog
│   └── 📂 i18n, trpc …
│
├── 📂 server               # SSR/worker-only pieces (tenant theme, pwa)
│
├── 📂 shared               # Shared across features; never imports app or features
│   ├── 📂 components
│   ├── 📂 fonts            # font catalog CSS + resolver (was app/fonts)
│   ├── 📂 hooks
│   ├── 📂 lib
│   ├── 📂 public-menu      # public menu domain core (new, see below)
│   └── 📂 tenant           # TenantContext type (new)
│
├── 📄 routeTree.gen.ts
└── 📄 vite-env.d.ts
```

`shared/public-menu/` (new — breaks the menu↔promos cycle and serves contact, legal,
server and shared consumers):

```plaintext
  src/shared/public-menu
  |
  +-- public-menu-types.ts        # PublicMenuData/Category/Dish/Promotion (derived from lib RouterOutputs)
  +-- menu-view-model.ts          # MenuDishViewModel + view-model types
  +-- price-formatter.ts          # createPublicPriceFormatter (was features/menu/mappers)
  +-- map-dish.ts                 # mapDish, extracted from features/menu/mappers/map-public-menu-content
  +-- promotion-formatting.ts     # formatDiscount / formatValidity / resolvePromotionPrice / pickFeaturedPromo / mapPromotionToFeatured
  +-- public-menu-query-options.ts# getPublicMenuQueryOptions (was features/menu/api)
  +-- menu-content-context.ts     # MenuContentContext + useMenuContent (was features/menu/hooks)
```

### apps/admin/src

```plaintext
  📂 apps/admin/src
├── 📂 app                  # Application layer: routes, composition, bootstrap
│   ├── 📂 dashboard        # was features/dashboard: aggregated cards + query barrel
│   ├── 📂 routes
│   └── 📂 shell            # admin shell chrome (was shared/components/shell)
│
├── 📂 features             # analytics, auth, billing, branch, exchange-rates,
│   │                       # languages, loyalty, menu, promotions, qr, theme, users
│
├── 📂 lib                  # trpc client (+ RouterOutputs contract)
│
└── 📂 shared
    ├── 📂 components
    ├── 📂 hooks
    ├── 📂 images
    ├── 📂 services
    └── 📂 stores           # branch / language / shell zustand stores (was app/store)
```

Feature anatomy stays as the migration baseline:

```plaintext
  src/features/<feature>
  |
  +-- api         # exported query options and API hooks for the feature
  +-- components  # components scoped to the feature
  +-- hooks       # hooks scoped to the feature
  +-- mappers     # mapping logic scoped to the feature
  +-- types       # typescript types used within the feature
  +-- utils
```

## Refactors, step by step

Each step keeps the tree green: after every step run
`bun run check && bun run lint && bun run test`. The warning count after each step is the
progress meter (73 → 0). Move files with `git mv` to preserve history; update importers with
search-and-replace on the moved specifier.

### Step 1 — Type contracts into lib (fixes cluster A, 12 violations)

1. `apps/admin/src/lib/trpc.ts` and `apps/web/src/lib/trpc-client.ts` already import
   `AppRouter` (lib→worker is allowed). Export from each:
   `export type RouterOutputs = inferRouterOutputs<AppRouter>;` and
   `export type RouterInputs = inferRouterInputs<AppRouter>;`
2. Re-point the 10 feature/shared files that derive `type RouterOutputs = inferRouterOutputs<AppRouter>`
   to `import type { RouterOutputs } from "~/lib/trpc"` (admin) / `"~/lib/trpc-client"` (web).
   Each file deletes its local `AppRouter` + `inferRouterOutputs` imports.
3. Leave `public-menu-types.ts` for step 4 (it moves anyway).

### Step 2 — App-wide stores into shared (fixes clusters B, part of M, 10 violations)

1. `git mv apps/admin/src/app/store apps/admin/src/shared/stores`
2. shell-store keeps importing `~/shared/hooks/*` — as shared→shared this stays allowed.
3. Re-point importers (`~/app/store/*` → `~/shared/stores/*`): features/auth (2),
   features/languages, features/menu (via use-selected-language), features/dashboard (1),
   shared/api.ts, shared/hooks/use-selected-branch, shared/images/use-image-save,
   shared/components/shell/admin-shell (resolved again in step 3).

### Step 3 — Composition out of shared and features into app (fixes clusters C, D, H, 16 violations)

1. `git mv apps/admin/src/features/dashboard apps/admin/src/app/dashboard`. Only
   `app/routes/*` imports it (verified); re-point those imports. The dashboard `api.ts`
   barrel re-exporting other features' query options becomes legal app→feature.
2. `git mv apps/admin/src/shared/components/shell apps/admin/src/app/shell`. Only consumer:
   `app/routes/_auth.tsx`. The shell now imports app stores directly and features/languages
   - features/auth as an app element.
3. Contact page composition: `{-$locale}.contacto.tsx` (app) composes
   `<InstallCard>` (features/install) and `<LegalLinksNav>` (features/legal) and passes them
   into `<ContactPage installCard={...} legalLinksNav={...} />` as props. ContactPage drops
   both imports. If prop-drilling reads badly, an accepted fallback is moving these two
   small components to `shared/components/` — but only if they import nothing
   feature-scoped (verify first; InstallCard depends on `features/install/use-install-prompt`).

### Step 4 — Web public-menu domain core into shared (fixes clusters F, G, most of I, 24 violations)

This is the largest step; it removes the only true cycle in the codebase (menu → promos →
menu) by extracting the domain core both features build on.

1. Create `apps/web/src/shared/public-menu/` and move:
   - `features/menu/api/public-menu-types.ts` — derive from `RouterOutputs` (step 1) so the
     file imports `~/lib/trpc-client`, not `@qmenut/api/router`.
   - `features/menu/types/menu-view-model.ts` (menu + promos view models).
   - `features/menu/mappers/create-public-price-formatter.ts` → `price-formatter.ts`.
   - Extract `mapDish` from `features/menu/mappers/map-public-menu-content.ts` →
     `map-dish.ts` (it is the piece promos reuses; the rest of the file stays in menu).
   - `features/promos/mappers/promotion-formatting.ts`,
     `features/promos/mappers/pick-featured-promo.ts`,
     `features/promos/mappers/map-promotion-to-featured.ts` — promotion rendering over
     `PublicMenuPromotion` is shared domain logic, not promos-specific.
   - `features/menu/api/public-menu-query-options.ts` — every public route, three features
     and two shared hooks fetch the public menu; it is the web-wide data layer.
2. Re-point consumers: features/menu (keeps feature-specific mappers importing shared),
   features/promos, features/contact, features/legal, server/pwa/build-web-manifest,
   shared/hooks/use-public-tenant, shared/components/analytics-bootstrap, app routes.
3. `features/menu/api/index.ts` (public entrypoint) keeps re-exporting whatever it still
   owns; delete entries that moved.

### Step 5 — Menu content context into shared (fixes rest of cluster I, 2 violations)

1. `git mv apps/web/src/features/menu/hooks/menu-content-context-value.ts
apps/web/src/shared/public-menu/menu-content-context.ts`
2. `features/menu/hooks/menu-content-context.tsx` (the Provider component) stays in menu and
   imports the context from shared; feature→shared allowed. `useMappedMenuContent` stays in
   the feature.
3. Re-point `shared/components/public-route-layout/*` to the shared context.
   If during implementation the Provider (feature) turns out to be needed by the shared
   layout directly, pass it from the app as `contentProvider`. The layout mounts it inside
   `PublicRouteLayoutContext.Provider`, since menu mapping reads the selected currency.
   Do not wrap the entire layout with the menu provider or move the Provider into shared.

### Step 6 — Server-owned types into shared (fixes cluster K and shared→server, 4 violations)

1. Move the `TenantContext` interface from `apps/web/src/server/tenant-theme.ts` to
   `apps/web/src/shared/tenant/tenant-context.ts`; tenant-theme re-exports it.
2. Re-point `features/menu/seo/build-page-head.ts` and `shared/hooks/use-tenant-context.ts`
   to `~/shared/tenant/tenant-context`.
3. `apps/web/src/app/fonts/*` → `apps/web/src/shared/fonts/*` (ts + the four `?url` css
   assets). Consumers: `app/routes/__root.tsx` (app→shared), `server/tenant-theme.ts`
   (server→shared), `shared/components/public-page-shell.tsx` (shared→shared).

### Step 7 — Analytics contracts into lib (fixes cluster J, 2 violations)

1. Move `DishOpenSource` and `InstallMode` definitions into
   `apps/web/src/lib/analytics/event-catalog.ts` (they are event payload unions — the
   catalog owns its contract).
2. `features/menu/types/menu-view-model.ts` (now `shared/public-menu/menu-view-model.ts`)
   and `features/install/use-install-prompt.ts` import the unions from lib
   (feature→lib allowed) and re-export for their internal callers.

### Step 8 — Remaining admin domain edges: shared api facade or approved exceptions (cluster L, 5 edges)

After steps 1–3 the remaining admin cross-feature edges are:

- `features/loyalty` → `features/menu/api`, `features/theme/api` (3)
- `features/promotions` → `features/menu/api` (1)
- `features/menu` → `features/languages` `useSelectedLanguage` (2)

Decide per edge during execution, cheapest first:

1. **Query options consumed by ≥2 features** (`getMenuDishesQueryOptions`,
   `getThemeQueryOptions`, `getLanguagesQueryOptions`) move to
   `apps/admin/src/shared/api/<domain>.ts` (shared→package allowed; the owning feature
   imports shared). Applies to menu dishes/categories and theme query options.
2. `useSelectedLanguage` is a thin hook over the (now shared) language store + languages
   catalog. Move it to `shared/hooks/use-selected-language.ts` **only if** its languages-api
   import also moves per (1); otherwise menu consumers read the language from
   `~/shared/stores` directly and resolve the catalog where the query already lives.
3. Any edge that survives both options gets an explicit policy entry in `.oxlintrc.jsonc`
   (`dependencies` policy `allow` with the captured from/to pair and a comment naming the
   reason) — approved, visible, counted, and removed when the feature evolves.

## Activation (the goal of the task)

When `bunx oxlint .` reports **0 warnings**:

1. In `.oxlintrc.jsonc`: `boundaries/dependencies`,
   `boundaries/no-unknown-dependencies`, `boundaries/no-unknown-files` → `"error"`.
2. Root `package.json`: `"lint": "oxfmt --check . && prettier --check \"apps/landing/**/*.astro\" && oxlint . --deny-warnings"`.
3. Pre-commit hook stays `bun run lint && bun run check` (now failing on any warning).
4. `bun run lint:fixtures` must still pass unchanged — the fixtures prove the promoted rules
   still fire.
5. Update `docs/operations/lint-migration.md` (remove the "deferred" note) and the boundary
   policy paragraph in `AGENTS.md`.

## Risk notes

- **Step 4 is the risky one**: it moves ~10 files and touches ~25 import sites; the
  menu↔promos mapper cycle means partial moves can create _new_ violations. Do it as one
  commit, run the full gate, and expect the warning count to drop by exactly the number of
  edges listed — if it does not, stop and re-derive.
- **Vite CSS assets**: moving `app/fonts` carries `?url` imports; `astro check`/`tsc` must
  confirm asset typing still resolves from the new location.
- **React Compiler**: apps/web is compiled — moving providers/context across files can
  change memoization surfaces. `bun run build` + E2E smoke of the menu/contact/destacados
  routes after steps 4–5.
- **Do not** "fix" violations with `oxlint-disable` comments; a violation is either
  refactored into the model or turned into a named policy exception in the config.
