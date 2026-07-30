# apps/web — public menu (SSR worker) 🧩

> **Stub** — Purpose + key files below; expand when needed.

## Purpose & status

✅ Complete (menu + loyalty are live; **promos and contacto pages are still
mock-backed**). The customer-facing per-tenant menu site. React 19 + TanStack Start +
TanStack Router, server-rendered by Vite + Nitro (`cloudflare-module` preset), deployed
as a Cloudflare Worker. Tenant identity and theme come from the request host (see
[../domains/custom-domains.md](../domains/custom-domains.md) and
[../domains/theming.md](../domains/theming.md)).

## How it fits together

- **Bindings** (`apps/web/wrangler.jsonc`): KV `TENANT_THEME`, service `API_WORKER` →
  `qmenut-api`, `TENANT_HOST` var.
- **SSR entry**: `apps/web/src/app/server.ts` wraps the TanStack Start handler in
  `serveWithSentry` → `serveWithEdgeCache`.
- **Server layer** (`apps/web/src/server/`): `tenant-host.ts` (resolve host),
  `tenant-theme.ts` (read theme from KV), `edge-cache.ts`, `lit-dom-shim.ts` (SSR shim
  for the Lit `@qmenut/ui` web components), `sentry.ts`.
- **Data access**: `apps/web/src/lib/trpc-client.ts` — during SSR calls the API via the
  `API_WORKER` binding (`getApiWorkerBinding`, `cloudflare:workers`); in the browser
  falls back to HTTP.
- **Routes** (`apps/web/src/app/routes/`, locale-prefixed `{-$locale}.*`): index (menu),
  `puntos` (loyalty), `promos` (**mock**), `contacto` (**mock**), `aviso-legal` /
  `privacidad` (legal), plus `sitemap.xml.ts`, `robots.txt.ts`.
- **Features** (`apps/web/src/features/`): `menu`, `loyalty` (live tRPC); `promos`,
  `contact` (mock); `legal`.

## Key files

| Concern | Path |
|---|---|
| Worker config/bindings | `apps/web/wrangler.jsonc` |
| SSR entry | `apps/web/src/app/server.ts` |
| Root route (theme/context) | `apps/web/src/app/routes/__root.tsx` |
| Server helpers | `apps/web/src/server/` |
| tRPC client (binding + HTTP) | `apps/web/src/lib/trpc-client.ts` |
| Page shell (applies theme) | `apps/web/src/shared/components/public-page-shell.tsx` |
| i18n | `apps/web/src/lib/i18n/` |

## Notes & gotchas

- **Lit SSR shim** (`lit-dom-shim.ts`) is required for the web components to render on
  the worker — don't remove it.
- Promos/contacto are mock-backed; wiring promos to the real API is the tracked MVP1
  gap (see [../domains/promotions.md](../domains/promotions.md)).
