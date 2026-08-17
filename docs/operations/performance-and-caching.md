# Performance and caching

The public menu Worker combines tenant-scoped Cloudflare edge caching, a short browser
cache contract, and immutable hashed assets. The implementation is
`apps/web/src/server/edge-cache.ts`. Cache invalidation crosses the API and tenant-config
Workers.

## Cache layers

Requests pass through three independent layers:

1. Cloudflare `caches.default` stores rendered HTML and crawler responses per tenant.
2. The browser receives `BROWSER_CACHE_CONTROL` from `apps/web/src/lib/browser-cache.ts`,
   which is `public, max-age=60, must-revalidate`. The edge cache's longer `s-maxage`
   value is replaced before the response leaves the Worker.
3. `/assets/*` receives `public, max-age=31536000, immutable` from
   `apps/web/public/_headers`. Vite content hashes make that safe.

A service worker adds a fourth layer in front of these, in the browser. It is per origin
and per device, and it is deliberately not invalidated by `menuVersion`: HTML is fetched
network-first, so a reachable network always wins. See [Public menu PWA](../apps/web-pwa.md).

## Cache key and policy

The edge cache key is:

```text
https://{host}{pathname}?menuVersion={version}
```

The host makes entries tenant-scoped. The version comes from
`TENANT_THEME["menuVersion:{host}"]`. Changing one tenant's version immediately selects a
new key without purging any other tenant's cache.

Note: `menuVersion` is a legacy name, kept to avoid migrating existing KV entries and
previously generated keys. It represents all public-content changes, not only menu rows.

Only `GET` requests to `CACHEABLE_ROUTES` are eligible. A leading locale segment is
removed before matching, so `/en/promos` follows the `/promos` policy.

| Route after locale removal                                                      | Fresh edge TTL | Stale window |
| ------------------------------------------------------------------------------- | -------------: | -----------: |
| `/`, `/promos`                                                                  |     15 minutes |     24 hours |
| `/contacto`, `/puntos`, `/aviso-legal`, `/privacidad`                           |       24 hours |     24 hours |
| `/robots.txt`, `/sitemap.xml`                                                   |       24 hours |     24 hours |
| `/offline`                                                                      |       24 hours |     24 hours |
| `/site.webmanifest`, `/icon.svg`, `/icon-maskable.svg`, `/apple-touch-icon.png` |       24 hours |     24 hours |

The shorter TTL for the menu and promotions pages limits drift around time-bounded
promotion windows. Unlisted paths and non-`GET` methods return
`X-QMenut-Cache: BYPASS`.

The PWA routes are generated per tenant from `menu.publicData` and the KV theme, so they
share the invalidation path used by HTML: saving a branch or a theme increments
`menuVersion:{host}`, which rotates the cache key for the manifest and the icons as well.

## Stale-while-revalidate

Cached copies carry an internal `x-qmenut-fresh-until` timestamp. The Worker removes that
header before responding to the browser and exposes one diagnostic header instead:

| Header value             | Meaning                                                           |
| ------------------------ | ----------------------------------------------------------------- |
| `X-QMenut-Cache: MISS`   | Rendered now and scheduled for cache population.                  |
| `X-QMenut-Cache: HIT`    | Served from cache and still fresh.                                |
| `X-QMenut-Cache: STALE`  | Served immediately while a background render refreshes the entry. |
| `X-QMenut-Cache: BYPASS` | The request or route is outside the cache policy.                 |

The module-level `revalidations` map deduplicates concurrent background refreshes for the
same cache key within one Worker isolate. `ctx.waitUntil` keeps cache writes alive after
the response is returned.

Four correctness rules must not be weakened:

- Cache only responses where `response.ok` is true.
- Never cache a response that carries `Set-Cookie`.
- Preserve the rule against cloning a response twice in `serveWithEdgeCache`. An unread
  `ReadableStream.tee()` branch can keep a Workers rendering stream alive indefinitely.
- Continue removing `x-qmenut-fresh-until` from browser-facing responses.

## Invalidation flow

```text
admin write
  → API mutation
  → THEME_WORKER service binding
  → PUT /tenants/:host/menu-version
  → Date.now() stored at menuVersion:{host}
  → next public request computes a new edge key
  → MISS, then HIT
```

`apps/api/src/lib/public-content-version.ts` resolves the branch or restaurant to a host
and calls tenant-config. The write is best-effort, so a content mutation does not fail
only because cache invalidation is unavailable. Operational monitoring should still
surface the logged error.

For the shared KV and host model, see [Custom domains](../domains/custom-domains.md).
`e2e/tests/cross/content-invalidation.spec.ts` verifies that an admin theme or content
write changes the public cache from a populated key to a new `MISS`, followed by a `HIT`.

## Operational checks

```bash
curl -sS -D - -o /dev/null https://TENANT_DOMAIN/
```

```bash
curl -sS -D - -o /dev/null https://TENANT_DOMAIN/robots.txt
```

Run the first command twice. On a cold tenant or version, expect `MISS` and then `HIT`.

A persistent `BYPASS` indicates an ineligible path or an unresolved tenant host. A
persistent `MISS` usually indicates cache write failures, a `Set-Cookie` header, a non-OK
rendered response, or requests reaching different cache locations.
