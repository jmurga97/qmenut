# Public menu Worker

`apps/web` is the server-rendered application that diners see. One `qmenut-web` Cloudflare
Worker serves every tenant domain. React 19, TanStack Start, TanStack Router, and
`@cloudflare/vite-plugin` render each page in workerd.

The normalized request host is the tenant identity. KV supplies the tenant's theme, and
tRPC over D1 supplies its content. See [Custom domains](../domains/custom-domains.md),
[Theming](../domains/theming.md), and
[Performance and caching](../operations/performance-and-caching.md).

## Status

Complete for the menu and loyalty pages. The promotions and contact pages are still
mock-backed: `use-promos-content.ts` and `use-contact-content.ts` map `MOCK_*` constants,
even though the promotions API and the effective-price view exist. USD-source menus can
also expose a restaurant-selected VES display rate.

## Worker entry point and rendering errors

The production entry point is `apps/web/src/app/server.ts`, which implements the
Cloudflare `fetch(request, env, ctx)` contract in this order:

1. `Sentry.withSentry` creates request-scoped Sentry instrumentation.
2. `/trpc` is proxied to the `API_WORKER` service binding. When the binding is absent, the
   local HTTP API is used instead.
3. `serveWithEdgeCache` handles eligible public routes.
4. TanStack Start's `handler.fetch` renders the response.

Keep this order. The comment in `server.ts` is deliberate: TanStack converts many
rendering exceptions into 5xx responses before the outer Worker wrapper can observe the
exception, so the entry point also captures returned 5xx responses.

There is no `apps/web/src/server/sentry.ts`. Its per-request `wrapRequestHandler`
workaround was needed when Nitro owned the top-level export. The Cloudflare Vite plugin
allows the Worker itself to be wrapped with `Sentry.withSentry`.

`@lit-labs/ssr-react/enable-lit-ssr.js` must remain the first import in both the server
and the client entry points. The server build uses its Node export to patch React element
creation and deep-render registered Lit components as declarative shadow DOM. The browser
export installs LitElement hydration support before any `@qmenut/ui` component loads, so
custom elements adopt their server-rendered shadow roots instead of replacing them.

## Host resolution

There are two host resolvers, because the edge cache runs before TanStack creates the
request context:

- `resolveRequestTenantHost(request)` reads the request URL for the outer cache wrapper.
- `resolveSsrTenantHost()` reads `getRequestHost()` from inside TanStack Start.

Both normalize the host, and neither trusts `X-Forwarded-Host`, which prevents tenant
confusion and cache poisoning. In development only, bare `localhost` and LAN IP hosts fall
back to `VITE_PUBLIC_MENU_HOST` and then to `fine.localhost`. Tenant-shaped hosts such as
`tapas.localhost` are unchanged. `tenant-theme.ts` mirrors the same `fine` fallback, so
the font preload links and the rendered theme agree on the first paint.

## Data access and same-origin tRPC

`apps/web/src/lib/trpc-client.ts` uses `API_WORKER` during server-side rendering when the
binding is available. In the browser, production requests go to same-origin `/trpc`, and
`server.ts` forwards them through the binding.

Two consequences follow. A new tenant domain does not need an API CORS entry, and public
loyalty does not use authentication cookies, because its `cardToken` lives in local
storage after the visitor accepts the privacy policy. The selected language and one-time
locale/install state use browser storage, while analytics uses memory-only persistence.
The Vite development proxy provides the same `/trpc` shape locally.

## Currency display

Menu prices remain stored and edited in the restaurant's `sourceCurrency`. For USD-source
restaurants, the public payload may include `vesExchangeRate` and `vesPricesEnabled`. The
currency selector is shown beside the language selector only when both values allow VES
display, and the selection is persisted in local storage under `qm-currency-choice`.

VES values are derived at display time from source minor units and the restaurant-selected
rate. The client uses fixed-point arithmetic and formats two decimal places; it never rewrites
the stored source price. The menu, highlights, promotions, discounts, extras, and featured
prices use the same selected display currency, while structured data continues to publish
source-currency prices.

The BCV/Ming reference is shown only in the authenticated admin dashboard as information for
the restaurant. Ming is optional for that summary and is not used when saving the local rate.
Its absence or failure never replaces the local rate and does not create an automatic warning
based on a percentage difference.

Client-reachable modules guard `cloudflare:workers` dynamic imports with
`import.meta.env.SSR`, so the browser bundle cannot import Worker-only runtime code.

## SEO

`apps/web/src/features/menu/seo/build-page-head.ts` builds each page's title,
description, canonical URL, Open Graph metadata and image, `og:locale:alternate`, hreflang
links, and optional JSON-LD. A route with no tenant loader data emits `noindex` instead of
advertising an empty tenant.

Indexing is controlled at Worker-environment level, never in tenant data. `ALLOW_INDEXING`
is false by default and in development, and true only in production. The Vite build bakes
the matching root `robots` meta tag into the HTML; the Worker adds `X-Robots-Tag: noindex,
nofollow` after the cache/proxy layer in non-indexable environments. Development's
`robots.txt` responds with `Disallow: /` for every tenant and does not advertise a sitemap.

The related helpers are:

- `build-hreflang-alternates.ts` emits only the tenant's active languages plus
  `x-default`.
- `build-restaurant-json-ld.ts` emits the restaurant, its address, hours, images, menu
  sections, dishes, and prices.
- `build-promotions-json-ld.ts` emits promotions as schema.org offers.
- `robots[.]txt.ts` emits the production crawler policy and host-specific sitemap URL, or a
  global restrictive policy in development.
- `sitemap[.]xml.ts` emits localized alternates for every currently available public route.
  It omits `/puntos` when the server-derived loyalty capability is disabled. Its `lastmod`
  value reads `menuVersion:{host}`, the same KV version used in the edge-cache key; admin
  loyalty writes bump that version so navigation, `/puntos`, and the sitemap converge on
  the current program state.

The same server-handler pattern serves the per-tenant web app manifest and icons through
`site[.]webmanifest.ts`, `icon[.]svg.ts`, `icon-maskable[.]svg.ts`, and
`apple-touch-icon[.]png.ts`. See [Public menu PWA](web-pwa.md).

## Bundle shape

`apps/web/vite.config.ts` splits the client output into React, data (TanStack and tRPC),
internationalization, and UI (Culori and Lit) vendor chunks. `ssrNodeConditions()` forces
the server environment to use Node and server export conditions, and fails the build if a
`browser` condition leaks into it. Do not remove that guard to make an incompatible
package resolve; fix the offending import or export conditions instead.

React render sites use the `/react` wrappers exported by `@qmenut/ui`. The wrappers
preserve non-string Lit properties during rendering and defer component hydration until
those properties have been restored on the client. Lit elements instantiated inside
another Lit template do not need React wrappers, because their parent component's
`defineQm*` chain registers them for deep server rendering.

## Key files

| Concern                           | Path                                                   |
| --------------------------------- | ------------------------------------------------------ |
| Worker configuration and bindings | `apps/web/wrangler.jsonc`                              |
| Worker entry point                | `apps/web/src/app/server.ts`                           |
| Edge cache                        | `apps/web/src/server/edge-cache.ts`                    |
| Host resolvers                    | `apps/web/src/server/tenant-host.ts`                   |
| KV theme read                     | `apps/web/src/server/tenant-theme.ts`                  |
| SEO helpers                       | `apps/web/src/features/menu/seo/`                      |
| tRPC client and proxy fallback    | `apps/web/src/lib/trpc-client.ts`                      |
| Vite bundle guards                | `apps/web/vite.config.ts`                              |
| Theme application                 | `apps/web/src/shared/components/public-page-shell.tsx` |

## Limitations

- Do not reintroduce `X-Forwarded-Host` as a tenant source.
- Preserve the response-stream rule in `serveWithEdgeCache`. An unread clone branch can
  keep a Workers rendering stream alive.
- The promotions and contact pages remain mock-backed and must not be described as live
  tenant data.
