# apps/web — public menu (SSR worker)

## Purpose and status

✅ Complete for the menu and loyalty surfaces. Promotions and contact are still
mock-backed: `use-promos-content.ts` and `use-contact-content.ts` map `MOCK_*` constants,
even though the promotions API and effective-price view exist.

One `qmenut-web` Cloudflare Worker serves every tenant domain. React 19, TanStack Start,
TanStack Router, and `@cloudflare/vite-plugin` render the page in workerd. The normalized
request host is the tenant identity; KV supplies its theme and D1-backed tRPC supplies its
content. See [custom domains](../domains/custom-domains.md),
[theming](../domains/theming.md), and [performance and caching](../operations/performance-and-caching.md).

## Worker entry and SSR errors

The production entry is `apps/web/src/app/server.ts`, using the real Cloudflare
`fetch(request, env, ctx)` contract:

1. `Sentry.withSentry` creates request-scoped Sentry instrumentation.
2. `/trpc` is proxied to the `API_WORKER` service binding, with the local HTTP API as the
   fallback when the binding is absent.
3. `serveWithEdgeCache` handles eligible public routes.
4. TanStack Start's `handler.fetch` renders the response.

Keep this ordering. The comment in `server.ts` is deliberate: TanStack converts many SSR
exceptions into 5xx responses before the outer Worker wrapper can observe the exception,
so the entry explicitly captures returned 5xx responses too.

There is no `apps/web/src/server/sentry.ts`. Its per-request `wrapRequestHandler`
workaround was needed when Nitro owned the top-level export; the Cloudflare Vite plugin
allows the Worker itself to be wrapped with `Sentry.withSentry`.

`lit-dom-shim.ts` must remain the first import: shared `@qmenut/ui` Lit components need
its DOM globals during workerd SSR.

## Host resolution

There are two host resolvers because the edge cache runs before TanStack creates request
context:

- `resolveRequestTenantHost(request)` reads the request URL for the outer cache wrapper.
- `resolveSsrTenantHost()` reads `getRequestHost()` from inside TanStack Start.

Both normalize the host and neither trusts `X-Forwarded-Host`, avoiding tenant confusion
and cache poisoning. In development only, bare `localhost` and LAN IP hosts fall back to
`VITE_PUBLIC_MENU_HOST`, then `fine.localhost`. Tenant-shaped hosts such as
`tapas.localhost` are unchanged. `tenant-theme.ts` mirrors the same `fine` fallback so
font preload links and the theme that renders agree on the first paint.

## Data access and same-origin tRPC

`apps/web/src/lib/trpc-client.ts` uses `API_WORKER` during SSR when available. In the
browser, production requests go to same-origin `/trpc`; `server.ts` forwards them through
the binding. This means a new tenant domain does not need an API CORS entry and public
loyalty does not use auth cookies: its `cardToken` lives in local storage. Vite's dev proxy
provides the same `/trpc` shape locally.

Client-reachable modules guard `cloudflare:workers` dynamic imports with
`import.meta.env.SSR` so the browser bundle cannot import Worker-only runtime code.

## SEO surface

`apps/web/src/features/menu/seo/build-page-head.ts` builds each page's title,
description, canonical URL, Open Graph metadata and image, `og:locale:alternate`,
hreflang links, and optional JSON-LD. A route with no tenant loader data emits `noindex`
instead of advertising an empty tenant.

Related helpers are:

- `build-hreflang-alternates.ts`: only the tenant's active languages plus `x-default`.
- `build-restaurant-json-ld.ts`: restaurant, address, hours, images, menu sections,
  dishes, and prices.
- `build-promotions-json-ld.ts`: promotions as schema.org offers.
- `robots[.]txt.ts`: crawler policy and a host-specific sitemap URL.
- `sitemap[.]xml.ts`: localized alternates for every public route. Its `lastmod` reads
  `menuVersion:{host}`, the same KV version used in the edge-cache key.

## Client and SSR bundle shape

`apps/web/vite.config.ts` manually splits the client output into React, data
(TanStack/tRPC), i18n, and UI (Culori/Lit) vendor chunks. `ssrNodeConditions()` forces
the SSR environment to use Node/server export conditions and fails the build if a
`browser` condition leaks into it. Do not remove that guard to make an incompatible
package resolve; fix the offending import or export conditions.

## Key files

| Concern                    | Path                                                   |
| -------------------------- | ------------------------------------------------------ |
| Worker config and bindings | `apps/web/wrangler.jsonc`                              |
| Worker entry               | `apps/web/src/app/server.ts`                           |
| Edge cache                 | `apps/web/src/server/edge-cache.ts`                    |
| Host resolvers             | `apps/web/src/server/tenant-host.ts`                   |
| KV theme read              | `apps/web/src/server/tenant-theme.ts`                  |
| SEO helpers                | `apps/web/src/features/menu/seo/`                      |
| tRPC client/proxy fallback | `apps/web/src/lib/trpc-client.ts`                      |
| Vite bundle guards         | `apps/web/vite.config.ts`                              |
| Theme application          | `apps/web/src/shared/components/public-page-shell.tsx` |

## Gotchas

- Do not reintroduce `X-Forwarded-Host` as a tenant source.
- Preserve the response-stream rule in `serveWithEdgeCache`: an unread clone branch can
  keep a Workers SSR stream alive.
- Promos and contacto remain mock-backed and must not be described as live tenant data.
