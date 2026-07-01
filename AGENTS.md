# Repository Guidelines

## Project Structure & Module Organization

This is a Bun monorepo orchestrated with Turbo. Application code lives under `apps/*`:

- `apps/web`: React 19 + Vite + TanStack Router frontend. Routes and app entry points are in `apps/web/src/app`; generated route files such as `route-tree.gen.ts` should not be edited manually.
- `apps/api`: Cloudflare Worker backend with native fetch dispatch, tRPC at `/trpc`, Better Auth at `/api/auth/*`, and Drizzle over D1. Source is in `apps/api/src`, Wrangler config in `apps/api/wrangler.toml`, and database migrations live in `apps/api/migrations`.
- `packages`: shared workspace packages used by multiple apps. `packages/http` holds the shared Hono/OpenAPIHono app factory, env base schema, error handling, and response helpers.

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

## Commit & Pull Request Guidelines

Git history is not available in this checkout, so use concise, imperative commit subjects such as `Add worker health response` or `Fix router route export`. Keep commits focused.

Pull requests should include a short summary, verification commands, linked issues, and screenshots for visible frontend changes. Call out Wrangler config, migration, or generated-file changes.

## Security & Configuration Tips

Do not commit secrets or local Cloudflare state. Keep environment-specific values in local Wrangler configuration or platform-managed secrets, and document any required variables in the relevant app README or PR description.
