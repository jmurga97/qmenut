# Performance and caching

The public-menu Worker combines tenant-scoped Cloudflare edge caching, a short browser
cache contract, and immutable hashed assets. The implementation is
`apps/web/src/server/edge-cache.ts`; cache invalidation crosses the API and
tenant-config workers.

## Cache layers

Requests pass through three independent layers:

1. Cloudflare `caches.default` stores rendered HTML and crawler responses per tenant.
2. The browser receives `BROWSER_CACHE_CONTROL` from
   `apps/web/src/lib/browser-cache.ts` (`public, max-age=60, must-revalidate`). The edge
   cache's longer `s-maxage` value is replaced before the response leaves the Worker.
3. `/assets/*` receives `public, max-age=31536000, immutable` from
   `apps/web/public/_headers`. Vite content hashes make that safe.

## Tenant-scoped key and policy

The edge key is:

```text
https://{host}{pathname}?menuVersion={version}
```

Host makes entries tenant-scoped. The version comes from
`TENANT_THEME["menuVersion:{host}"]`; changing one tenant's version instantly selects a
new key without purging anyone else's cache. `menuVersion` is a legacy name deliberately
kept to avoid migrating existing KV entries and previously generated keys. It represents
all public-content changes, not only menu rows.

Only GET requests to `CACHEABLE_ROUTES` are eligible. A leading locale segment is removed
before matching, so `/en/promos` follows `/promos` policy.

| Route after locale removal                            | Fresh edge TTL | Stale window |
| ----------------------------------------------------- | -------------: | -----------: |
| `/`, `/promos`                                        |     15 minutes |     24 hours |
| `/contacto`, `/puntos`, `/aviso-legal`, `/privacidad` |       24 hours |     24 hours |
| `/robots.txt`, `/sitemap.xml`                         |       24 hours |     24 hours |

The shorter menu/promotions TTL limits drift around time-bounded promotion windows.
Unlisted paths and non-GET methods return `X-QMenut-Cache: BYPASS`.

## Stale-while-revalidate mechanics

Cached copies carry an internal `x-qmenut-fresh-until` timestamp. The Worker removes that
header before responding to the browser and exposes one diagnostic header instead:

- `X-QMenut-Cache: MISS` — rendered now and scheduled for cache population.
- `X-QMenut-Cache: HIT` — cached and still fresh.
- `X-QMenut-Cache: STALE` — served immediately while a background render refreshes it.
- `X-QMenut-Cache: BYPASS` — request/route is outside policy.

The module-level `revalidations` map deduplicates concurrent background refreshes for the
same cache key within one Worker isolate. `ctx.waitUntil` keeps cache writes alive after
the response is returned.

Correctness rules that must not be weakened:

- cache only `response.ok` responses;
- never cache a response carrying `Set-Cookie`;
- preserve the "Do not clone this response again" rule in `serveWithEdgeCache`—an unread
  `ReadableStream.tee()` branch can keep a Workers SSR stream alive indefinitely;
- continue removing `x-qmenut-fresh-until` from browser-facing responses.

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

`apps/api/src/lib/public-content-version.ts` performs the branch/restaurant-to-host
resolution and calls tenant-config. The write is best effort so a content mutation does
not fail solely because cache invalidation is unavailable; operational monitoring should
still surface its logged error.

See [custom domains](../domains/custom-domains.md) for the shared KV and host model.
`e2e/tests/cross/content-invalidation.spec.ts` proves an admin theme/content write changes
the public cache from a populated key to a new `MISS`, followed by `HIT`.

## Operational checks

```bash
curl -sS -D - -o /dev/null https://TENANT_DOMAIN/
curl -sS -D - -o /dev/null https://TENANT_DOMAIN/
curl -sS -D - -o /dev/null https://TENANT_DOMAIN/robots.txt
```

Expect `MISS` then `HIT` for a cold tenant/version. A persistent `BYPASS` indicates an
ineligible path or unresolved tenant host; a persistent `MISS` usually indicates cache
write failures, `Set-Cookie`, non-OK SSR, or requests reaching different cache locations.
