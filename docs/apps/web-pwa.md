# Public menu PWA

`apps/web` is an installable, tenant-aware progressive web app. Installation uses the
restaurant name, theme colors, and best available icon. Offline mode keeps previously visited
menu documents readable without caching customer or loyalty API responses.

Admin and landing applications are not installable. Push notifications, background sync,
offline ordering, and offline photos are out of scope.

## Manifest and icons

`/site.webmanifest` is generated for the request host from `menu.publicData` and the tenant
theme in KV. It contains the app identity, display mode, colors, and icon candidates.

Icon selection follows this order:

1. The branch `logoUrl`, when configured. This is an arbitrary HTTPS URL and is best effort;
   Qmenut does not resize or validate its dimensions.
2. Tenant-colored SVG monograms from `/icon.svg` and `/icon-maskable.svg`.
3. Committed 192px and 512px PNGs under `apps/web/public/icons`.

`/apple-touch-icon.png` redirects to the configured logo or the committed 180px fallback.
The database and API only validate that a custom logo is a valid HTTPS URL.

The dynamic manifest and icon routes use the same tenant-versioned edge cache as public HTML.
Branch and theme saves rotate `menuVersion:{host}`, invalidating those responses.

## Installation UI

The contact page renders an install card when installation is possible:

- Chromium browsers use the captured `beforeinstallprompt` event.
- iOS browsers receive Share/menu instructions and a Safari fallback.
- Standalone sessions and already-installed apps hide the card.
- Dismissal is stored in `sessionStorage`, so it lasts for the current browser session.

The prompt event is captured before React hydration because browsers may dispatch it before
the contact route mounts. Installation and card interactions retain the existing PostHog PWA
events. All analytics events also include `display_mode: browser | standalone`.

## Offline behavior

`apps/web/public/sw.js` is a classic, unbundled service worker with two versioned caches:

| Request            | Strategy      | Result                                              |
| ------------------ | ------------- | --------------------------------------------------- |
| Navigations        | Network first | Latest SSR document, then a previously visited copy |
| `/assets/*`        | Cache first   | Content-hashed JavaScript, CSS, and fonts           |
| API and image URLs | Network only  | No loyalty data or cross-origin photo storage       |

The worker precaches `/offline` and `/en/offline` plus the build assets referenced by those
documents. An unvisited route redirects to the matching localized fallback with a validated
relative `returnTo` value. Retry performs a full navigation back to that destination.

The service worker is disabled in Vite development to avoid stale caches around unhashed HMR
modules. Build first, then use `bun run --cwd apps/web serve` for local PWA verification.

`SW_VERSION` must change when the cache contract or precached documents change. Browser update
checks bypass the HTTP cache through `updateViaCache: "none"`.

## Main files

- Manifest: `apps/web/src/app/routes/site[.]webmanifest.ts`
- Icon handlers: `apps/web/src/app/routes/icon[.]svg.ts`, `icon-maskable[.]svg.ts`, and
  `apple-touch-icon[.]png.ts`
- Service worker and registration: `apps/web/public/sw.js`, `apps/web/src/app/register-sw.ts`
- Offline route: `apps/web/src/app/routes/{-$locale}.offline.tsx`
- Install card: `apps/web/src/features/install/`

Do not add a static `site.webmanifest` alongside the dynamic route. Workers Static Assets
serves matching public files before the application Worker, which would shadow the route.
