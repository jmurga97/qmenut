# Lint migration (Prettier/ESLint → Oxfmt/Oxlint)

Tracking doc for the migration to Oxfmt (formatting) and Oxlint (linting) as the
primary toolchain. Prettier remains only for `apps/landing/**/*.astro` because
no published oxfmt version formats `.astro` (verified against oxfmt 0.67.0).

## Baseline (frozen 2026-09-10, `a2ba62e` + working tree)

| Check                                           | Result                    |
| ----------------------------------------------- | ------------------------- |
| `bun run lint` (prettier --check . && eslint .) | exit 0                    |
| ESLint                                          | 0 errors, **24 warnings** |
| `bun run check`                                 | exit 0, 11/11 tasks       |

Reproduce the raw diagnostics with:

```bash
bunx eslint . -f json > /tmp/eslint-baseline.json
```

### Warning inventory (per rule)

| Rule                                   | Count | Locations                                                                                                                                                                                                                                                                               |
| -------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `max-lines-per-function`               | 8     | packages/db/src/repositories/public-menu.repository.ts:360, packages/ui/src/components/{atoms.test.ts:44,146, molecules.test.ts:129,219, organisms.test.ts:56,172,260}                                                                                                                  |
| `max-params`                           | 2     | packages/ui/src/theme/color-engine.ts:93, packages/ui/src/theme/derive.ts:10                                                                                                                                                                                                            |
| `react-hooks/refs`                     | 12    | apps/admin/src/features/branch/components/branch-address-autocomplete.tsx:240,242; apps/admin/src/features/menu/hooks/use-menu-controllers.ts:136; apps/admin/src/features/qr/pages/qr-page.tsx:31,43,46,50; apps/admin/src/shared/components/forms/form-color-input.tsx:15,23,28,30,32 |
| `react-refresh/only-export-components` | 2     | apps/web/src/app/router.tsx:33, apps/web/src/features/menu/hooks/menu-content-context.tsx:21                                                                                                                                                                                            |

All 24 must be errors-or-resolved before `--deny-warnings` is enabled (phase 3).

## Negative fixtures

Temporary files written into real feature dirs by `bun run lint:fixtures`
(`scripts/lint-fixtures.ts`); oxlint must report each with the expected rule.

| Fixture              | Expected failure                                                     |
| -------------------- | -------------------------------------------------------------------- |
| cross-feature import | feature A imports feature B → `boundaries(dependencies)`             |
| shared → feature     | shared imports a feature SEO entrypoint → `boundaries(dependencies)` |
| floating promise     | unawaited promise → `typescript(no-floating-promises)`               |
| conditional hook     | conditional `useState` → `react-hooks(rules-of-hooks)`               |
| unresolved import    | module cannot resolve → TS2307 via `typeCheck`                       |

## Exit criteria (phase 7)

- `bun run lint`, `bun run check`, `bun run build`, E2E green.
- Zero warnings with `--deny-warnings`.
- No architectural rule lost: fixtures fail for the expected cause.

## Decisions and findings (migration log)

### Phase 1 — Prettier → Oxfmt

- No published oxfmt version (checked 0.67.0, 2026-09-07) formats `.astro`; its config schema
  has no astro option and the compatibility matrix says Astro needs Prettier-plugin support.
- Discovery: the repo's `.astro` file was **never** prettier-formatted — `prettier-plugin-astro`
  was never installed and `prettier --check .` silently skips unknown extensions. Honoring the
  plan's intent (the file stays formatted), `prettier-plugin-astro` was added and Prettier is
  now scoped to `apps/landing/**/*.astro` only (config: `prettier.config.js`, `.prettierignore`
  deleted).
- Oxfmt divergences accepted once (3 files): expanded union types, joined unbraced `if`
  statements — one-time reformat, thereafter byte-stable.
- oxfmt-only extras stay off (`sortImports`, `sortTailwindcss`, `sortPackageJson`) to preserve
  Prettier-equivalent output; import ordering is an Oxlint policy instead (see phase 5).

### Phase 2 — TypeScript 7

- All workspaces pinned to `typescript@7.0.2` except `apps/landing` at `6.0.3`: `astro check`
  requires the programmatic TS API that TS7 does not ship
  (withastro/roadmap#1321); all other workspaces run tsgo cleanly.
- `baseUrl` removed from admin/web/api tsconfigs (paths are tsconfig-relative since TS 5.0).
- `oxlint-tsgolint` installed at the root; oxlint runs with `typeAware` and `typeCheck`
  (experimental TS compiler diagnostics) enabled in `.oxlintrc.jsonc`.

### Phase 3 — Oxlint as main linter

- Generated with `@oxlint/migrate --type-aware` (538 rules), then curated by hand. Notable
  config fixes: oxlint's `unicorn/filename-case` and `jsx-a11y/control-has-associated-label`
  do not accept all eslint-plugin options (`checkDirectories`, `includeRoles` dropped).
- Promoted to error: `max-depth`, `max-lines-per-function`, `max-params`, `no-console`,
  `no-warning-comments`, `react/exhaustive-deps`, `react/only-export-components`,
  `react/incompatible-library`, `react/unsupported-syntax`,
  `@tanstack/query/no-rest-destructuring`, `@tanstack/router/create-route-property-order`.
- The 24 baseline warnings, resolved or approved:
  - `max-params` (2): `mix()` now takes `{ from, percent, to }` (QmColorMix) across the theme
    engine.
  - `max-lines-per-function` public-menu.repository (1): split into `loadPublicMenuRows` and
    `loadPublicMenuImageVariants` helpers.
  - `max-lines-per-function` tests (7): test bodies are exempt from the 80-line ceiling
    (approved diff).
  - `react-hooks/refs` admin (12): rule off in apps/admin (react-hook-form ref-shaped
    objects; admin is not compiler-compiled — same rationale as the old warn). Error in web.
  - `react-refresh/only-export-components` (2 → 4 under oxlint's stricter impl): RouteNotFound
    moved to `apps/web/src/app/route-not-found.tsx`; menu content hook moved to
    `menu-content-context-value.ts`; branch form provider split the same way;
    `branch-form-context.tsx` keeps only the Provider export.
- Approved rule diffs (documented, not silent):
  - `unicorn/prefer-top-level-await` off — misfires on synchronous zod builder chains.
  - `unicorn/no-useless-undefined` vs React 19 `useRef` (needs explicit `undefined`) —
    suppressed at the 4 call sites.
  - False positives suppressed inline with reasons: Leaflet `.map(a, b)` factory
    (qm-map), type-guard filter reference, intentionally focusable review rail
    (tabIndex), raw Provider export (branch-form-context).
  - `eslint-disable-next-line` comments converted to `oxlint-disable-next-line`
    (`@typescript-eslint/*` → `typescript/*`).
- New oxlint-only detections fixed in code (stricter than the old unicorn): `Number.NaN`,
  spread instead of `concat`/`split("")`, ternaries for simple if/else, useless switch case,
  optional param instead of explicit `undefined` argument.

### Phase 4 — Boundaries (eslint-plugin-boundaries v7 as jsPlugin)

- The 73-warning backlog is resolved: shared contracts, stores and public-menu logic now
  live below features; dashboard, shell and contact composition live in app. The three
  boundary rules are errors, and `bun run lint` uses `--deny-warnings` (also in pre-commit).
- App may compose feature components and hooks directly. Features may only import their
  own feature, shared, lib and packages. Removed the broad public-entrypoint allow policy,
  which had bypassed these restrictions for feature `api/`, `pages/` and `seo/` imports.
- v7 learnings (differ from the plan's v4-era rule names): `element-types`, `entry-point`,
  `no-private`, `no-unknown` are deprecated aliases — the canonical rule is
  `boundaries/dependencies` (policies with entity selectors); file-level classification
  belongs in `boundaries/files`; element patterns must match folders and captures map
  positionally to `*` (`{name}` brace capture does not work under oxlint).
- `import/resolver` (typescript + node) is required, or `~/` aliases silently skip checks.

### Phase 5 — JS plugins

- Verified live with probes: sonarjs, @tanstack/query, @tanstack/router, lit, wc,
  boundaries, eslint-plugin-import (aliased `x-import` for `order`, promoted to error —
  the codebase already complies).
- `eslint-plugin-react-hooks` as a JS plugin is impossible: oxlint reserves the
  `react-hooks` plugin name for its native Rust implementation. The migrated config's
  native `react/*` rules (set-state-in-render, purity, refs, immutability, …) ARE the
  compiler rules, so the "validate the native alternative" question resolves to native.
- `import/no-unresolved` has no oxlint implementation (by design); unresolvable imports are
  enforced by the type-aware `typeCheck` gate (TS2307) — covered by a fixture.

### Phase 6 — Rules diff audit

- Every rule the old config enabled explicitly is present in `.oxlintrc.jsonc` (verified by
  name, including the explicit `off` entries: `unicorn/no-null`, `switch-case-braces`,
  `prefer-global-this`, `consistent-boolean-name`, etc.).
- `@oxlint/migrate` skipped 176 rules; none silently:
  - **142 not implemented** (146 mostly stylistic `unicorn/prefer-*` suggestions plus a few
    structural ones) — deleted with approval; the tool's own notes document native oxc/oxc
    or tsgolint coverage for a large subset (`oxc/bad-comparison-sequence`,
    `typescript/no-unnecessary-boolean-literal-compare`, …).
  - **4 nursery**: `no-undef` (superseded by TypeScript), `no-useless-assignment`,
    `unicorn/no-useless-iterator-to-array`, `react/require-render-return` (no class
    components in the repo).
  - **30 unsupported**: 22 superseded by type checking/oxc rules, plus `import/order`
    (→ `x-import/order`, error), `import/no-unresolved` (→ TS2307 via `typeCheck`),
    `react/jsx-uses-vars` (→ `eslint/no-unused-vars`), `react-hooks/config|gating`
    (fixed compiler options in oxlint).
- Additions the old config lacked: the full type-aware typescript-eslint set
  (no-floating-promises, no-misused-promises, unsafe-*), native React Compiler rules,
  boundaries architecture rules, and experimental TS compiler diagnostics (`typeCheck`).

`bun run lint:fixtures` writes temp files into real feature dirs, runs oxlint and asserts
each file fails with its expected rule; an error in another fixture cannot satisfy it.
All five pass: cross-feature import, shared→feature import, floating promise, conditional
hook, unresolved import. The former app-private-internals probe did not match the policy
(app composes features) and passed accidentally on the cross-feature diagnostic; it is
replaced by a shared→feature SEO import that verifies the removed allow policy stays closed.

## Final state (2026-09-11)

| Gate                                                                                   | Result                                            |
| -------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `bun run lint` (oxfmt --check + prettier astro + oxlint)                               | exit 0 — zero warnings, `--deny-warnings` enabled |
| `bun run lint:fixtures`                                                                | all 5 fixtures fail with the expected rule        |
| `bun run check` (tsc 7 + astro check + drizzle)                                        | 11/11 green                                       |
| `bun run build`                                                                        | 5/5 green                                         |
| `bun run test` (packages/ui)                                                           | 39 pass                                           |
| `bun run test:e2e --project=web tests/web/menu.spec.ts tests/web/public-pages.spec.ts` | 8 pass (including auth setup)                     |

Removed: `eslint.config.js`, ESLint + its plugins, typescript-eslint, `globals`,
`.prettierignore`. Kept: `prettier` + `prettier-plugin-astro` (Astro residual until oxfmt
supports it), `eslint-plugin-import` (aliased `x-import`), `eslint-plugin-boundaries`,
`eslint-plugin-sonarjs`, `eslint-plugin-lit`, `eslint-plugin-wc`,
`@tanstack/eslint-plugin-*`, `eslint-import-resolver-typescript` (boundaries resolver).

Follow-ups (in priority order):

1. Replace Prettier entirely once oxfmt ships Astro support.
2. Revisit the test exemption for `max-lines-per-function` if test growth becomes a problem.
