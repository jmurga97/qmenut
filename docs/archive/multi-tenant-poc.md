> 📦 **Archived — content folded into the current docs.** This POC writeup is still
> broadly accurate but superseded by [../domains/theming.md](../domains/theming.md) and
> [../domains/custom-domains.md](../domains/custom-domains.md). Kept for the "Run it"
> local-setup notes.

# Multi-tenant public menu POC

One D1 database holds all tenants (resolved by `branches.custom_domain` from the request host).
Per-tenant theming lives in the `TENANT_THEME` Workers KV namespace as a **full preset object**
(`QmTenantThemeConfig` = every `QmTemplatePreset` field + `template` + `primary` + `secondary` +
optional `tagline`). A tenant without a KV entry falls back to
`TEMPLATES[DEFAULT_TEMPLATE]` from `packages/ui/src/theme/presets.ts`.

Apps involved:

- `apps/api` — tRPC worker (`menu.publicData({ host })`), D1 binding.
- `apps/web` — TanStack Start SSR on Cloudflare Workers (nitro `cloudflare-module` preset).
  Reads KV directly at SSR time; theme vars are inlined into the HTML (no flash).
- `apps/tenant-config` — write side of KV: `GET/PUT/DELETE /tenants/:host/theme`
  (PUT/DELETE need `Authorization: Bearer <THEME_WORKER_TOKEN>`, `dev-token` locally).

Local KV state is shared across workers through `<repo>/.wrangler-shared/state` (the namespace
**id** in `apps/web/wrangler.jsonc` and `apps/tenant-config/wrangler.jsonc` must match — local
storage is keyed by id). The api keeps its own default persist dir for D1.

## Run it

```bash
bun install

# 1. API (terminal 1): migrate + seed 3 tenants, then serve on :8787
cd apps/api
bun run db:migrate:local
bun run db:seed:local          # tapas/fine/cafe .localhost (idempotent)
bun run dev

# 2. KV themes: tapas + fine only — cafe stays on the presets.ts fallback
cd apps/tenant-config
bun run seed:local

# 3a. Fast path (terminal 2): one dev server, Host header picks the tenant
cd apps/web
bun run dev
#   http://tapas.localhost:5173    tapas data + tapas KV theme
#   http://fine.localhost:5173     fine data + fine KV theme
#   http://cafe.localhost:5173     cafe data + DEFAULT theme (no KV entry)
#   http://unknown.localhost:5173  "Carta no disponible"

# 3b. Deploy-shaped path: one built worker; Host header picks the tenant
cd apps/web
bun run build
bun run serve          # :4011 (all share .wrangler-shared KV)
#   http://tapas.localhost:4011  tapas data + tapas KV theme
#   http://fine.localhost:4011   fine data + fine KV theme
#   http://cafe.localhost:4011   cafe data + DEFAULT theme (no KV entry)
```

## Live theme edits

```bash
cd apps/tenant-config && bun run dev   # :8788

curl -X PUT http://localhost:8788/tenants/cafe.localhost/theme \
  -H "Authorization: Bearer dev-token" -H "content-type: application/json" \
  -d '{"template":"cafe","primary":"#2F6F4E","secondary":"#D97706","tagline":"Café de especialidad"}'
# partial bodies are normalized to a full preset before storage; reload the page to see it

curl -X DELETE http://localhost:8788/tenants/cafe.localhost/theme \
  -H "Authorization: Bearer dev-token"   # back to the presets.ts default
```

## Real deploys (not done in the POC)

- Create the KV namespace once (`wrangler kv namespace create TENANT_THEME`) and put its id in
  both wrangler configs.
- Nitro generates `.output/server/wrangler.json` + a `.wrangler/deploy/config.json` redirect —
  and redirected configs **cannot contain `env` blocks**. That is fine because there is one
  web worker: attach real custom domains to `qmenut-web` and let the request Host header
  resolve the tenant.

## Notes / gotchas

- `wrangler d1 execute --local` while a `wrangler dev` holds the same store can lose
  uncheckpointed writes if that dev process is killed — stop the api before migrate/seed.
- Lit components in the worker bundle need Node resolve conditions during the SSR build
  (`ssr.resolve.conditions` in `apps/web/vite.config.ts`) plus the `@lit-labs/ssr-dom-shim`
  globals installed in `src/app/server.ts` before any `@qmenut/ui` import.
- Multi-word Lit props (`section-label`, `old-price`, `photo-url`, `empty-label`) must be
  written as kebab attributes from JSX or SSR'd values are dropped on hydration.
- promos/contacto/puntos still render mock content (they do get the real tenant + theme).
