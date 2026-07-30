# Theming (the color-engine)

How each branch gets its own look — colours, fonts, geometry — from two brand
colours and a template choice, applied to the public menu with no flash of the
wrong theme.

## Purpose & status

✅ Complete. A tenant picks a **template** (one of five looks) plus a **primary** and
**secondary** brand colour (and optional tagline/fonts). The *color-engine* derives a
full, legible colour system from that, which is applied to the public menu as CSS
custom properties (`--qm-*`). The engine was recently refactored (commit "refactored
color-engine") into a single singleton.

## Where theme lives

Per-tenant theme is stored in the **`TENANT_THEME` KV namespace, keyed by the branch's
normalized host** (its `customDomain`). The stored value is a **full preset object** —
every template field plus the tenant's own choices — so a reader never needs the
template catalog to render. The shape is `QmTenantThemeConfig`
(`packages/ui/src/theme/tenant-theme-config.ts:13`).

Writes to that KV go **only** through the `apps/tenant-config` worker (see
[custom-domains.md](custom-domains.md)); the web app reads the KV directly.

## The pieces (`packages/ui/src/theme/`)

| File | Responsibility |
|---|---|
| `color-engine.ts` | `QmColorEngine` singleton (`qmColorEngine`): derives the full colour group from a template + 2 colours. |
| `presets.ts` | The 5 templates (`TEMPLATES`): `fine`, `her`, `fast`, `cafe`, `tapas`. Everything the tenant does *not* choose. |
| `apply-theme.ts` | `buildQmThemeVars(input)` → the full `--qm-*` variable map; `applyQmTheme(el, …)` writes them. |
| `derive.ts` | Thin wrapper (`deriveQmTheme`, `mix`) over the engine used by `apply-theme`. |
| `tenant-theme-config.ts` | `QmTenantThemeConfig` (the KV shape) + `resolveTenantThemeConfig` (narrows arbitrary KV JSON safely). |
| `font-catalog.ts` | Font id catalog + `getFontStack` + heading/body validity guards. |
| `tokens.ts` | Base token definitions. |

## How the color-engine works

`QmColorEngine` (`color-engine.ts:72`) uses `culori`'s OKLCH converter and mirrors a
reference engine's `derive()` exactly. Given a template and the tenant's raw
`primary`/`secondary`, `derive(cfg)` (`color-engine.ts:113`) returns a `QmDerivedColors`
group: `bg, card, ink, muted, hairline, tint, emph, emphInk, price, accent, accentInk`,
plus on-colours and the effective saturation cap.

The primitives it is built from:

- **`mix(a, pct, b)`** (`color-engine.ts:93`) emits a *live* `color-mix(in oklab, a
  pct%, b)` CSS string — colours are **not** pre-resolved to hex. The browser does the
  final mixing, which keeps output faithful and lets one variable cascade into shadow
  DOM.
- **`clampChroma(hex, cap)`** (`color-engine.ts:98`) parses to OKLCH and caps chroma to
  the template's `saturationCap`, re-serialising as `oklch(...)`. This is what stops a
  garish brand colour from making the whole menu unreadable; `cap: null` disables it.
- **`onColor(hex)`** (`color-engine.ts:107`) picks a readable on-colour (dark ink vs
  white) by OKLCH lightness against a threshold — automatic contrast for text on brand
  backgrounds.
- Engine-wide fallbacks (default brand colours, thresholds) live in `DEFAULT_CONFIG`
  (`color-engine.ts:56`) and can be overridden with `configure()`.

## Templates (`presets.ts`)

Five `QmTemplatePreset`s. Each defines everything the tenant does *not* pick: fonts &
weights, `fontScale`, radius/border/rule geometry, `photoMode` (none/thumb/hero/heroxl),
`badgeShape`, `navStyle`, `saturationCap`, `paper`, and the `tone` mix percentages the
engine feeds into `mix()`. `DEFAULT_TEMPLATE` is `"her"`
(`tenant-theme-config.ts:24`).

## Applying it to the public menu (no flash)

`buildQmThemeVars(input)` (`apply-theme.ts`) is a pure function that assembles the
entire `--qm-*` map — colours (from the engine) plus typography, geometry, photo,
badge and nav token groups. On the public menu this happens at SSR, so the correct
theme is in the very first HTML byte:

1. **Read** — `getTenantContext` (`apps/web/src/server/tenant-theme.ts:29`), a
   TanStack `createServerFn`, resolves the host and reads `TENANT_THEME.get(host,
   "json")` straight from the KV binding, then narrows it with
   `resolveTenantThemeConfig`. `getCachedTenantContext` (`tenant-theme.ts:38`) reuses
   it across client navigations but never across SSR requests.
2. **Route context** — `apps/web/src/app/routes/__root.tsx` puts `tenant` into the
   router context (`beforeLoad`) and injects the font stylesheet/preload links for the
   resolved theme (`head`).
3. **Apply** — `apps/web/src/shared/components/public-page-shell.tsx` calls
   `buildQmThemeVars(...)` and writes the `--qm-*` variables onto the page;
   descendant Lit web components inherit them through the CSS cascade (including into
   shadow DOM).

`resolveTenantThemeConfig` (`tenant-theme-config.ts:53`) is the safety net: unknown or
invalid KV JSON falls back to the default config, and a valid `template` with missing
preset fields is overlaid on that template so partial entries still render.

## The admin theme editor

Owners edit theme in the admin SPA:

- Route `apps/admin/src/app/routes/_auth.theme.tsx` → page
  `apps/admin/src/features/theme/pages/theme-page.tsx`.
- Controller `apps/admin/src/features/theme/hooks/use-theme-controller.ts` —
  react-hook-form + zod, with a live preview driven by `useWatch` over
  `primary`/`secondary`/`tagline`.
- Colour input: `apps/admin/src/shared/components/forms/form-color-input.tsx`.

Save path (`apps/api/src/modules/theme/theme.router.ts`):

1. `themeRouter.save` is a `tenantProcedure` mutation; input validated by
   `saveThemeSchema` (`theme.router.ts:19`) — hex-colour regex, template restricted to
   the five names, optional fonts checked against the catalog.
2. `requirePermission(ctx.tenant, "theme.write")` (`theme.router.ts:41`).
3. `resolveBranchHost({ restaurantId, branchId })` finds the branch's `customDomain`
   (the KV key) — and authorizes the branch on the way.
4. `putTheme(...)` (`apps/api/src/lib/theme/theme-worker-client.ts`) writes to KV
   **through the tenant-config worker** (`THEME_WORKER` binding); the worker normalizes
   the body so KV always stores a complete config.
5. `bumpPublicContentVersionForBranch(...)` bumps a public-content version so caches
   invalidate (`apps/api/src/lib/public-content-version.ts`).

`themeRouter.get` reads back through `getTheme(...)` for the editor.

## Walkthrough: colour → pixels

1. Owner sets primary `#A23A28` in the admin editor and saves.
2. `admin.theme.save` → permission check → `resolveBranchHost` → `putTheme` → the
   tenant-config worker runs `resolveTenantThemeConfig` and `PUT`s the full object to
   `TENANT_THEME[host]`; content version bumped.
3. A diner loads the menu. `getTenantContext` reads `TENANT_THEME[host]`.
4. `buildQmThemeVars` calls `qmColorEngine.derive(...)`: `#A23A28` is chroma-clamped to
   the template cap, then `--qm-bg`, `--qm-ink`, `--qm-accent`, etc. are emitted as
   `color-mix(...)`/`oklch(...)` strings.
5. `public-page-shell` applies the vars; the Lit components render in the tenant's
   colours from the first paint.

## Key files

| Concern | Path |
|---|---|
| Color engine | `packages/ui/src/theme/color-engine.ts` |
| Templates | `packages/ui/src/theme/presets.ts` |
| CSS-var builder | `packages/ui/src/theme/apply-theme.ts` |
| KV config shape + narrowing | `packages/ui/src/theme/tenant-theme-config.ts` |
| Fonts | `packages/ui/src/theme/font-catalog.ts` |
| Web: read theme at SSR | `apps/web/src/server/tenant-theme.ts` |
| Web: apply theme | `apps/web/src/app/routes/__root.tsx`, `apps/web/src/shared/components/public-page-shell.tsx` |
| Admin editor | `apps/admin/src/features/theme/`, `apps/admin/src/app/routes/_auth.theme.tsx` |
| Theme API (save/get) | `apps/api/src/modules/theme/theme.router.ts` |
| KV writer client | `apps/api/src/lib/theme/theme-worker-client.ts` |

## Notes & gotchas

- **Colours are CSS `color-mix`/`oklch` strings, not hex.** Don't "resolve" them in
  code expecting hex — the point is that the browser mixes them live.
- **One writer.** Never `PUT` to `TENANT_THEME` from the API directly; always go
  through the tenant-config worker so normalization and the token check apply.
- **KV key = normalized host.** A branch with no `customDomain` yet has nowhere to
  store theme — `resolveBranchHost` throws `PRECONDITION_FAILED` in that case (see
  [custom-domains.md](custom-domains.md)).
- The engine comment notes it mirrors a reference `qmenut-theme.js` `derive()`; keep
  the two in step if that reference is still authoritative.
