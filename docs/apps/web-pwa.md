# Public menu PWA

`apps/web` is an installable, tenant-aware progressive web app. Installation uses the
restaurant name, the theme colors, and the best available icon. Offline mode keeps
previously visited menu documents readable without caching customer or loyalty API
responses.

The admin dashboard and the marketing site are not installable. Push notifications,
background sync, offline ordering, and offline photos are out of scope.

## Manifest and icons

`/site.webmanifest` is generated for the request host from `menu.publicData` and the
tenant theme in KV. It contains the app identity, the display mode, the colors, and the
icon candidates.

Icons are selected in this order:

1. The branch `logoUrl`, when it is configured. This is an arbitrary HTTPS URL and is used
   on a best-effort basis. qmenut does not resize or validate its dimensions.
2. Tenant-colored SVG monograms from `/icon.svg` and `/icon-maskable.svg`.
3. Committed 192-pixel and 512-pixel PNG files under `apps/web/public/icons`.

`/apple-touch-icon.png` redirects to the configured logo, or to the committed 180-pixel
fallback. The database and the API validate only that a custom logo is a valid HTTPS URL.

The dynamic manifest and icon routes use the same tenant-versioned edge cache as public
HTML. Saving a branch or a theme rotates `menuVersion:{host}`, which invalidates those
responses.

## Installation UI

The contact page renders an install card when installation is possible:

- Chromium browsers use the captured `beforeinstallprompt` event.
- iOS browsers receive Share and menu instructions, plus a Safari fallback.
- Standalone sessions and already-installed applications hide the card.
- Dismissal is stored in `sessionStorage`, so it lasts for the current browser session.

The prompt event is captured before React hydration, because browsers may dispatch it
before the contact route mounts. Installation and card interactions keep the existing
PostHog PWA events. All analytics events also include
`display_mode: browser | standalone`.

## Offline behavior

`apps/web/public/sw.js` is a classic, unbundled service worker with two versioned caches:

| Request            | Strategy      | Result                                                        |
| ------------------ | ------------- | ------------------------------------------------------------- |
| Navigations        | Network first | The latest rendered document, then a previously visited copy. |
| `/assets/*`        | Cache first   | Content-hashed JavaScript, CSS, and fonts.                    |
| API and image URLs | Network only  | No loyalty data and no cross-origin photo storage.            |

The service worker precaches `/offline` and `/en/offline`, plus the build assets those
documents reference. An unvisited route redirects to the matching localized fallback with
a validated relative `returnTo` value. Retrying performs a full navigation back to that
destination.

The service worker is disabled in Vite development to avoid stale caches around unhashed
HMR modules. To verify PWA behavior locally, build first and then run
`bun run --cwd apps/web serve`.

`SW_VERSION` must change when the cache contract or the precached documents change.
Browser update checks bypass the HTTP cache through `updateViaCache: "none"`.

## Key files

| Concern                         | Path                                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| Manifest                        | `apps/web/src/app/routes/site[.]webmanifest.ts`                                                |
| Icon handlers                   | `apps/web/src/app/routes/icon[.]svg.ts`, `icon-maskable[.]svg.ts`, `apple-touch-icon[.]png.ts` |
| Service worker and registration | `apps/web/public/sw.js`, `apps/web/src/app/register-sw.ts`                                     |
| Offline route                   | `apps/web/src/app/routes/{-$locale}.offline.tsx`                                               |
| Install card                    | `apps/web/src/features/install/`                                                               |

## Limitations

- Do not add a static `site.webmanifest` alongside the dynamic route. Workers Static
  Assets serves matching public files before the application Worker, which would shadow
  the route.
