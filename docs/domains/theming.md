# Theming

This page describes how each branch gets its own colors, fonts, and geometry from two
brand colors and a template choice, and how that theme is applied to the public menu
without a flash of the wrong theme.

## Status

Complete. A tenant picks a template, one of five, plus a primary and a secondary brand
color, and optionally a tagline and fonts. The color engine derives a full, legible color
system from those values and applies it to the public menu as CSS custom properties named
`--qm-*`. The engine is a single singleton.

## Where the theme is stored

The per-tenant theme is stored in the `TENANT_THEME` KV namespace, keyed by the branch's
normalized host, which is its `customDomain`. The stored value is a complete preset
object that contains every template field plus the tenant's own choices, so a reader
never needs the template catalog to render a page. The shape is `QmTenantThemeConfig`
(`packages/ui/src/theme/tenant-theme-config.ts:13`).

Only the `apps/tenant-config` Worker writes to that namespace; see
[Custom domains](custom-domains.md). The web application reads from it directly.

## Theme system files

All of the following are in `packages/ui/src/theme/`.

| File                     | Responsibility                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `color-engine.ts`        | The `QmColorEngine` singleton, `qmColorEngine`, which derives the full color group from a template and two colors. |
| `presets.ts`             | The five templates (`fine`, `her`, `fast`, `cafe`, and `tapas`) and their layout defaults.                         |
| `apply-theme.ts`         | `buildQmThemeVars(input)` builds the full `--qm-*` contract, and `applyQmTheme` writes it.                         |
| `derive.ts`              | A thin `deriveQmTheme` and `mix` wrapper over the engine.                                                          |
| `tenant-theme-config.ts` | The KV value shape and the `resolveTenantThemeConfig` normalizer.                                                  |
| `font-catalog.ts`        | The font catalog, the font stacks, and the heading and body validity guards.                                       |
| `tokens.ts`              | The typed CSS-variable contract that components consume.                                                           |

## How the color engine works

`QmColorEngine` (`color-engine.ts:72`) uses the OKLCH converter from `culori` and mirrors
the `derive()` function of a reference engine. Given a template and the tenant's raw
`primary` and `secondary` colors, `derive(cfg)` (`color-engine.ts:113`) returns a
`QmDerivedColors` group containing `bg`, `card`, `ink`, `muted`, `hairline`, `tint`,
`emph`, `emphInk`, `price`, `accent`, and `accentInk`, along with the on-colors and the
effective saturation cap.

The engine is built from these primitives:

- `mix(a, pct, b)` (`color-engine.ts:93`) emits a live `color-mix(in oklab, a pct%, b)`
  CSS string. Colors are not pre-resolved to hex. The browser performs the final mixing,
  which keeps the output faithful and lets one variable cascade into shadow DOM.
- `clampChroma(hex, cap)` (`color-engine.ts:98`) parses the color to OKLCH, caps chroma at
  the template's `saturationCap`, and re-serializes it as `oklch(...)`. This keeps a
  saturated brand color from making the menu hard to read. Setting `cap` to `null`
  disables the clamp.
- `onColor(hex)` (`color-engine.ts:107`) picks a readable foreground color, either dark
  ink or white, by comparing OKLCH lightness against a threshold. This produces automatic
  contrast for text on brand backgrounds.
- Engine-wide fallbacks, such as the default brand colors and the thresholds, live in
  `DEFAULT_CONFIG` (`color-engine.ts:56`) and can be replaced with `configure()`.

## Templates

`presets.ts` defines five `QmTemplatePreset` values. Each one specifies everything the
tenant does not pick: fonts and weights, `fontScale`, radius, border, and rule geometry,
`photoMode` (`none`, `thumb`, `hero`, or `heroxl`), `badgeShape`, `navStyle`,
`saturationCap`, `paper`, and the `tone` mix percentages that the engine passes to
`mix()`. `DEFAULT_TEMPLATE` is `"her"` (`tenant-theme-config.ts:24`).

## Applying the theme to the public menu

`buildQmThemeVars(input)` in `apply-theme.ts` is a pure function that assembles the entire
`--qm-*` map. The contract includes:

- Derived brand, surface, text, accent, price, border, tint, and on-color tokens.
- Font families and weights, tracking and casing, and the pre-scaled type scale from
  `2xs` through `display`.
- Layout tokens for the shell, the header and hero, sections, rows, featured cards,
  promos, surfaces, sheets, and modals, touch targets, and category navigation.
- Core radius, border, rule, number, spacing, shadow, placeholder, and divider geometry.
- Photo modes (`none`, `thumb`, `hero`, and `heroxl`), badge and tag styles, and
  navigation states (`bar`, `floating`, and `solid`).

The selected preset's `layout` map is merged with shared shell constraints before the
photo, badge, and navigation expansions are added. Components consume concrete values and
do not need to know which preset produced them. `qm-category-chip` and `qm-category-nav`
consume the category and navigation groups directly.

On the public menu this happens during server-side rendering, so the correct theme is
present in the first HTML response:

1. Read. `getTenantContext` (`apps/web/src/server/tenant-theme.ts:29`), a TanStack
   `createServerFn`, resolves the host, reads `TENANT_THEME.get(host, "json")` from the KV
   binding, and narrows the value with `resolveTenantThemeConfig`.
   `getCachedTenantContext` (`tenant-theme.ts:38`) reuses the result across client
   navigations but never across server-rendered requests.
2. Route context. `apps/web/src/app/routes/__root.tsx` puts `tenant` into the router
   context in `beforeLoad` and injects the font stylesheet and preload links for the
   resolved theme in `head`.
3. Apply. `apps/web/src/shared/components/public-page-shell.tsx` calls
   `buildQmThemeVars(...)` and writes the `--qm-*` variables onto the page. Descendant Lit
   web components inherit them through the CSS cascade, including into shadow DOM.

`resolveTenantThemeConfig` (`tenant-theme-config.ts:53`) is the safety net. Unknown or
invalid KV JSON falls back to the default configuration, and a valid `template` with
missing preset fields is overlaid on that template so partial entries still render.

## Development template switcher

The public menu has a development-only template override for comparing all five designs
against the same tenant content. `apps/web/src/app/routes/{-$locale}.tsx` validates the
`?template=fine|her|fast|cafe|tapas` search parameter and exposes it only when
`import.meta.env.DEV` is true.

`DevTemplateSwitcher` (`apps/web/src/shared/dev/dev-template-switcher.tsx`) shows the
active override and maps `Cmd+1` through `Cmd+5`, or `Ctrl+1` through `Ctrl+5`, to the
templates in that order. `useTemplateSelection` gives the override priority over the
tenant's KV template. The parameter has no effect in production.

Each template has a seed file at `apps/tenant-config/seed/*.localhost.json`. The
end-to-end suite exercises all five hosts, and `e2e/tests/web/templates.spec.ts` provides
platform-scoped visual snapshots when the `visual` project is enabled. See
[Testing](../operations/testing.md).

## The admin theme editor

Owners edit the theme in the admin SPA:

- The route is `apps/admin/src/app/routes/_auth.theme.tsx` and the page is
  `apps/admin/src/features/theme/pages/theme-page.tsx`.
- The controller is `apps/admin/src/features/theme/hooks/use-theme-controller.ts`. It
  uses react-hook-form and Zod, with a live preview driven by `useWatch` over `primary`,
  `secondary`, and `tagline`.
- The color input is `apps/admin/src/shared/components/forms/form-color-input.tsx`.

The save path is in `apps/api/src/modules/theme/theme.router.ts`:

1. `themeRouter.save` is a `tenantProcedure` mutation. Its input is validated by
   `saveThemeSchema` (`theme.router.ts:19`), which applies a hex-color pattern, restricts
   `template` to the five names, and checks optional fonts against the catalog.
2. `requirePermission(ctx.tenant, "theme.write")` runs (`theme.router.ts:41`).
3. `resolveBranchHost({ restaurantId, branchId })` finds the branch's `customDomain`,
   which is the KV key, and authorizes the branch at the same time.
4. `putTheme(...)` (`apps/api/src/lib/theme/theme-worker-client.ts`) writes to KV through
   the tenant-config Worker over the `THEME_WORKER` binding. That Worker normalizes the
   body, so KV always stores a complete configuration.
5. `bumpPublicContentVersionForBranch(...)` increments the public-content version so
   caches are invalidated (`apps/api/src/lib/public-content-version.ts`).

`themeRouter.get` reads the value back through `getTheme(...)` for the editor.

## Example: from a color to pixels

1. The owner sets the primary color to `#A23A28` in the admin editor and saves.
2. `admin.theme.save` runs the permission check, calls `resolveBranchHost`, and calls
   `putTheme`. The tenant-config Worker runs `resolveTenantThemeConfig` and writes the
   complete object to `TENANT_THEME[host]`. The content version is incremented.
3. A diner loads the menu, and `getTenantContext` reads `TENANT_THEME[host]`.
4. `buildQmThemeVars` calls `qmColorEngine.derive(...)`. `#A23A28` is chroma-clamped to
   the template cap, and `--qm-bg`, `--qm-ink`, `--qm-accent`, and the other tokens are
   emitted as `color-mix(...)` and `oklch(...)` strings.
5. `public-page-shell` applies the variables, and the Lit components render in the
   tenant's colors from the first paint.

## Key files

| Concern                              | Path                                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------------- |
| Color engine                         | `packages/ui/src/theme/color-engine.ts`                                                      |
| Templates                            | `packages/ui/src/theme/presets.ts`                                                           |
| CSS-variable builder                 | `packages/ui/src/theme/apply-theme.ts`                                                       |
| KV value shape and narrowing         | `packages/ui/src/theme/tenant-theme-config.ts`                                               |
| Fonts                                | `packages/ui/src/theme/font-catalog.ts`                                                      |
| Web: read the theme during rendering | `apps/web/src/server/tenant-theme.ts`                                                        |
| Web: apply the theme                 | `apps/web/src/app/routes/__root.tsx`, `apps/web/src/shared/components/public-page-shell.tsx` |
| Admin editor                         | `apps/admin/src/features/theme/`, `apps/admin/src/app/routes/_auth.theme.tsx`                |
| Theme API (`save` and `get`)         | `apps/api/src/modules/theme/theme.router.ts`                                                 |
| KV writer client                     | `apps/api/src/lib/theme/theme-worker-client.ts`                                              |

## Limitations

- Colors are CSS `color-mix` and `oklch` strings, not hex values. Do not resolve them in
  code that expects hex; the browser is meant to perform the mixing.
- There is one writer. Never write to `TENANT_THEME` from the API directly. Always go
  through the tenant-config Worker so that normalization and the token check apply.
- The KV key is the normalized host. A branch without a `customDomain` has nowhere to
  store its theme, and `resolveBranchHost` throws `PRECONDITION_FAILED` in that case. See
  [Custom domains](custom-domains.md).
- A comment in the engine states that it mirrors the `derive()` function of a reference
  `qmenut-theme.js`. Keep the two in step if that reference is still authoritative.
