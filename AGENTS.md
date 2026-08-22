# Repository Guidelines

## Project Structure & Module Organization

This is a Bun monorepo orchestrated with Turbo. Application code lives under `apps/*`:

- `apps/web`: React 19 + Vite + TanStack Router frontend. Routes and app entry points are in `apps/web/src/app`; generated route files such as `route-tree.gen.ts` should not be edited manually.
- `apps/api`: Cloudflare Worker backend with native fetch dispatch, tRPC at `/trpc`, Better Auth at `/api/auth/*`, and Drizzle over D1. Source is in `apps/api/src`, Wrangler config in `apps/api/wrangler.jsonc`, and database migrations live in `apps/api/migrations`.
- `apps/admin`: React 19 + Vite owner dashboard SPA, deployed as a static-asset Worker.
- `apps/tenant-config`: Cloudflare Worker that owns writes to the shared tenant-theme KV namespace.
- `apps/landing`: Astro 5 SSR marketing site with its own deploy script.
- `packages`: shared workspace packages used by multiple apps, including `auth`, `db`, `permissions`, and `ui`. The API dispatches requests natively from `apps/api/src/index.ts`.

Generated output such as `apps/web/dist`, `.wrangler`, `.turbo`, and `node_modules` should stay out of source changes.

## Build, Test, and Development Commands

Use Bun `1.3.6` as declared in `package.json`.

- `bun install`: install workspace dependencies from `bun.lock`.
- `bun run dev`: run Turbo development tasks for all apps.
- `bun run build`: build all workspaces; web uses Vite, the Workers generate Wrangler types and type-check.
- `bun run check`: run TypeScript `tsc --noEmit` checks through Turbo.
- `bun run lint`: run Prettier checks and ESLint.
- `bun run lint:fix` or `bun run format`: apply formatting and safe lint fixes.

For app-specific work, run commands in the package, for example `bun run --cwd apps/web dev` or `bun run --cwd apps/api dev`.

## Database Migration Workflow

The TypeScript schema in `packages/db/src/schema/` is the source of truth for D1. After
changing it, run `bun run --cwd apps/api db:generate -- --name <change_name>` and commit
the generated SQL plus `apps/api/migrations/meta/` together. Use
`db:generate:custom` only for data migrations or DDL that Drizzle Kit cannot generate.

Wrangler remains the migration executor (`db:migrate:local` / `db:migrate`). Do not use
`drizzle-kit push`, `wrangler d1 migrations create`, hand-author normal DDL migrations,
or edit a migration after it has been applied. `bun run check` verifies that the schema
matches the latest committed Drizzle snapshot. Drizzle Kit reads only the barrel
`packages/db/src/schema/index.ts`; a table that is not reachable from it is not managed.
The full workflow, the SQLite gotchas, and the production preflight are in
[docs/operations/database-migrations.md](docs/operations/database-migrations.md).

## Coding Style & Naming Conventions

Write TypeScript as ES modules. Prettier enforces 2-space indentation, semicolons, double quotes, trailing commas, and a 100-character line width. ESLint requires type-only imports, ordered imports, exhaustive switch checks, strict equality, and no unused variables except names prefixed with `_`.

Use `PascalCase` for React components, `camelCase` for functions and variables, and route filenames that match TanStack Router conventions.

The files are created using snake case (util-types.ts)
Do not rewrite eslint rules if im not asking for it
If lint indicates an error in max-params, prefer passing an object instead more params
Prefer early return pattern to avoid issues with max-depth eslint rule
Avoid barrel imports for everything. Just one barrel for a whole module or package

## Testing Guidelines

DO NOT IMPLEMENT EARLY TESTS IF IM NOT ASKING FOR IT.

Playwright E2E tests live in `e2e/`. Install Chromium once with
`bunx playwright install chromium`. Before running them locally, map every seeded
tenant host to loopback in `/etc/hosts`:

```bash
echo "127.0.0.1 tapas.localhost fine.localhost cafe.localhost her.localhost fast.localhost" | sudo tee -a /etc/hosts
```

Then run `bun run test:e2e`. The test reset
recreates local D1 data and shared tenant-theme KV data before starting the API,
tenant-config, admin, and public-menu workers. The public menu runs as one worker
with the tenant selected by the Host header. E2E auth uses `e2e@test.local` with OTP `000000`.
The `DEV_FIXED_OTP` flag enables `000000` for provisioned accounts in local, test, and
the deployed development worker; it must never be configured in production. Use
`E2E_REUSE_SERVERS=1` while iterating against already-running
E2E workers. Set `E2E_VISUAL=1` to register the OS-sensitive template snapshot
project locally; generate Linux baselines by running the visual project in a Linux container.

## Commit & Pull Request Guidelines

Git history is not available in this checkout, so use concise, imperative commit subjects such as `Add worker health response` or `Fix router route export`. Keep commits focused.

Pull requests should include a short summary, verification commands, linked issues, and screenshots for visible frontend changes. Call out Wrangler config, migration, or generated-file changes.

## Security & Configuration Tips

Do not commit secrets or local Cloudflare state. Keep environment-specific values in local Wrangler configuration or platform-managed secrets, and document any required variables in the relevant app README or PR description.
