const ISR_ROUTE_PATTERN = /^\/(?:[a-z]{2,3}(?:-[a-z]{2,4})?\/)?(?:contacto|promos|puntos|aviso-legal|privacidad)?\/?$/i;

async function readMenuVersion(host: string): Promise<string | null> {
  try {
    // eslint-disable-next-line import/no-unresolved -- runtime module provided by workerd
    const { env } = await import("cloudflare:workers");
    const kv = (env as { TENANT_THEME?: { get(key: string): Promise<string | null> } }).TENANT_THEME;

    return (await kv?.get(`menuVersion:${host}`)) ?? null;
  } catch {
    return null;
  }
}

interface BuildCacheKeyInput {
  host: string;
  pathname: string;
  version: string | null;
}

function buildCacheKey({ host, pathname, version }: BuildCacheKeyInput): Request {
  const keyUrl = new URL(`https://${host}${pathname}`);

  keyUrl.searchParams.set("menuVersion", version ?? "none");

  return new Request(keyUrl.toString(), { method: "GET" });
}

interface EdgeCacheContext {
  cache: Cache;
  cacheKey: Request;
}

/**
 * Only resolves a cache key for the 6 ISR-eligible public routes; everything else (server-fn
 * RPCs, assets, robots/sitemap) falls straight through to normal rendering.
 */
async function resolveEdgeCacheContext(request: Request): Promise<EdgeCacheContext | null> {
  try {
    if (request.method !== "GET") {
      return null;
    }

    const url = new URL(request.url);

    if (!ISR_ROUTE_PATTERN.test(url.pathname)) {
      return null;
    }

    const { resolveSsrTenantHost } = await import("./tenant-host");
    const host = await resolveSsrTenantHost();

    if (!host) {
      return null;
    }

    const version = await readMenuVersion(host);
    // `.default` is a Cloudflare-specific CacheStorage extension not in the standard lib types.
    const cache = (caches as unknown as { default: Cache }).default;

    return { cache, cacheKey: buildCacheKey({ host, pathname: url.pathname, version }) };
  } catch {
    // No `cloudflare:workers` / `caches` under plain `vite dev` — render uncached, same as
    // readTenantThemeFromKv's fallback.
    return null;
  }
}

/**
 * Classic Workers ISR: a Worker's response is never cached by the edge CDN just from
 * Cache-Control headers, since the Worker runs in front of the cache. This explicitly reads
 * from/writes to the Cache API, keyed by a per-tenant `menuVersion` (bumped in KV whenever a
 * menu edit lands) instead of a wall-clock TTL — the cache busts exactly when content changes.
 */
export async function serveWithEdgeCache(
  request: Request,
  render: () => Response | Promise<Response>,
): Promise<Response> {
  const context = await resolveEdgeCacheContext(request);

  if (!context) {
    return render();
  }

  const cached = await context.cache.match(context.cacheKey).catch(() => undefined);

  if (cached) {
    return cached;
  }

  const response = await render();

  if (response.ok) {
    try {
      // eslint-disable-next-line import/no-unresolved -- runtime module provided by workerd
      const { waitUntil } = await import("cloudflare:workers");

      waitUntil(context.cache.put(context.cacheKey, response.clone()));
    } catch {
      // Same local-dev fallback as above — skip caching, don't block the response.
    }
  }

  return response;
}
