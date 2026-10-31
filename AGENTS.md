# Repository Guidelines

Start with [docs/README.md](docs/README.md) → [docs/architecture.md](docs/architecture.md). Product vocabulary: [CONTEXT.md](CONTEXT.md).

## Layout

Bun `1.4.0` monorepo, Turbo. All Workers on Cloudflare.

| Path                | What                                                                                                                                                                              |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api`          | tRPC `/trpc`, Better Auth `/api/auth/*`, Stripe webhook, crons, queues. Drizzle over D1. Only writer of `TENANT_THEME` KV (`src/lib/theme/tenant-theme-store.ts`, lint-enforced). |
| `apps/web`          | Public menu. React 19 + TanStack Start, SSR on one Worker for every tenant (Host = tenant). Don't edit `route-tree.gen.ts`.                                                       |
| `apps/admin`        | Owner dashboard. React 19 + Vite SPA on a static-asset Worker.                                                                                                                    |
| `apps/landing`      | Astro 5 SSR marketing site.                                                                                                                                                       |
| `packages/*`        | `db` (schema, repositories), `auth`, `permissions`, `ui` (Lit components + theme engine).                                                                                         |
| `e2e/`              | Playwright.                                                                                                                                                                       |
| `scripts/deploy.ts` | Deploy orchestrator; per-environment build vars live in its map.                                                                                                                  |
| `../qmenut-ops`     | Separate repo: tenant onboarding, remote migrations, DB rebuild. Never imported.                                                                                                  |

Keep `dist`, `.wrangler`, `.turbo`, `node_modules` out of changes.

## Commands

| Command                                      | Does                                                                                         |
| -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `bun install`                                | Install from `bun.lock`. Never npm/pnpm/yarn.                                                |
| `bun run dev` / `bun run dev:kill`           | Start / stop all dev servers.                                                                |
| `bun run build`                              | Build all; Workers run `wrangler types` + `tsc`.                                             |
| `bun run check`                              | `tsc --noEmit` everywhere + `db:check`.                                                      |
| `bun run lint`                               | Oxfmt check, Prettier (`apps/landing/**/*.astro` only), Oxlint type-aware `--deny-warnings`. |
| `bun run lint:fixtures`                      | Boundary rules must still flag their negative fixtures.                                      |
| `bun run format`                             | Apply Oxfmt + scoped Prettier.                                                               |
| `bun run test`                               | Unit tests (`packages/ui`).                                                                  |
| `bun run test:e2e`                           | Playwright. See [docs/operations/testing.md](docs/operations/testing.md).                    |
| `bun run db:generate -- --name <change>`     | Generate a migration from the schema.                                                        |
| `bun run deploy --development\|--production` | Preflight → tests → build → D1 migrations → deploy. Flag is mandatory.                       |

Per app: `bun run --cwd apps/<app> <script>`.

## Database

- Source of truth: `packages/db/src/schema/`, reachable from the barrel `index.ts` only.
- Change schema → `bun run db:generate -- --name <change>` → commit schema + SQL + `apps/api/migrations/meta/` together.
- `db:generate:custom` only for data migrations or DDL Drizzle can't generate.
- Never: `drizzle-kit push`, `wrangler d1 migrations create`, hand-written DDL, editing an applied migration, `DROP TABLE` on a parent table.
- Full guide: [docs/operations/database-migrations.md](docs/operations/database-migrations.md).

## Code style

- ES modules. Oxfmt: 2 spaces, semicolons, double quotes, trailing commas, 120 columns.
- Oxlint: type-only imports, ordered imports, exhaustive switches, `===`, unused vars only as `_name`.
- Layers `app → features → shared → lib → packages` are lint errors when crossed. A feature never imports another feature. See [code layers](docs/architecture.md#code-layers).
- Files in snake case (`util_types.ts`). React components `PascalCase`, functions/variables `camelCase`, routes follow TanStack Router conventions.
- Do not rewrite lint rules in `.oxlintrc.jsonc` unless asked.
- `max-params` error → pass one object.
- Prefer early returns over nesting (`max-depth`).
- One barrel per module or package, no more.

## Testing

**DO NOT IMPLEMENT EARLY TESTS IF IM NOT ASKING FOR IT.**

E2E needs the tenant hosts in `/etc/hosts` and `bun run dev` stopped (Playwright starts its own API :8787 and admin :5174; it reuses web :4011). Sign in as `e2e@test.local`, OTP `000000` (`DEV_FIXED_OTP`: local, E2E and dev Worker only, never production).

## Commits and PRs

- Short imperative subjects (`Add worker health response`). Focused commits.
- PRs: summary, verification commands, linked issues, screenshots for UI changes. Call out Wrangler config, migration or generated-file changes.

## Security

- No secrets or local Cloudflare state in git. Secrets go through `wrangler secret put`.
- Admin enforces Trusted Types (`apps/admin/public/_headers`). Never assign strings to `innerHTML`/`outerHTML`/`srcdoc` or use `dangerouslySetInnerHTML`; use DOM APIs or a named policy in the `trusted-types` allowlist (see `shared/services/qr.ts`). New dependencies must not inject styles/HTML at runtime (e.g. `react-easy-crop` → `disableAutomaticStylesInjection` + import its CSS).
