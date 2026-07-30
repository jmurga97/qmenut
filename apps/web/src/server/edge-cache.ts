import { BROWSER_CACHE_CONTROL } from "~/lib/browser-cache";
import { LOCALE_PATTERN } from "~/lib/i18n/locale-pattern";

const PROMOTION_EDGE_TTL_SECONDS = 15 * 60;
const DEFAULT_EDGE_TTL_SECONDS = 24 * 60 * 60;
// Legacy KV key prefix retained to avoid migrating existing tenant version entries.
const LEGACY_CONTENT_VERSION_KEY_PREFIX = "menuVersion:";
// Legacy query parameter retained so previously generated edge-cache keys remain compatible.
const LEGACY_CONTENT_VERSION_QUERY_PARAM = "menuVersion";
const CACHE_STATUS_HEADER = "X-QMenut-Cache";
const CACHEABLE_ROUTES = new Set([
  "",
  "contacto",
  "promos",
  "puntos",
  "aviso-legal",
  "privacidad",
  "robots.txt",
  "sitemap.xml",
]);
type CacheStatus = "BYPASS" | "HIT" | "MISS";

async function readPublicContentVersion(host: string): Promise<string | null> {
  try {
    // eslint-disable-next-line import/no-unresolved -- runtime module provided by workerd
    const { env } = await import("cloudflare:workers");
    const kv = (env as { TENANT_THEME?: { get(key: string): Promise<string | null> } }).TENANT_THEME;

    return (await kv?.get(`${LEGACY_CONTENT_VERSION_KEY_PREFIX}${host}`)) ?? null;
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

  keyUrl.searchParams.set(LEGACY_CONTENT_VERSION_QUERY_PARAM, version ?? "none");

  return new Request(keyUrl.href);
}

function getEdgeTtlSeconds(pathname: string): number | null {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] && LOCALE_PATTERN.test(segments[0])) {
    segments.shift();
  }

  const route = segments.join("/").toLowerCase();

  if (!CACHEABLE_ROUTES.has(route)) {
    return null;
  }

  return route === "" || route === "promos" ? PROMOTION_EDGE_TTL_SECONDS : DEFAULT_EDGE_TTL_SECONDS;
}

interface EdgeCacheContext {
  cache: Cache;
  cacheKey: Request;
  edgeTtlSeconds: number;
}

/** Resolves the per-tenant cache key and policy for public HTML and crawler routes. */
async function resolveEdgeCacheContext(request: Request): Promise<EdgeCacheContext | null> {
  try {
    if (request.method !== "GET") {
      return null;
    }

    const url = new URL(request.url);
    const edgeTtlSeconds = getEdgeTtlSeconds(url.pathname);

    if (edgeTtlSeconds === null) {
      return null;
    }

    const { resolveSsrTenantHost } = await import("./tenant-host");
    const host = await resolveSsrTenantHost();

    if (!host) {
      return null;
    }

    const version = await readPublicContentVersion(host);
    // `.default` is a Cloudflare-specific CacheStorage extension not in the standard lib types.
    const cache = (caches as unknown as { default: Cache }).default;

    return {
      cache,
      cacheKey: buildCacheKey({ host, pathname: url.pathname, version }),
      edgeTtlSeconds,
    };
  } catch {
    // No `cloudflare:workers` / `caches` under plain Vite dev: render uncached.
    return null;
  }
}

interface CacheStatusResponseInput {
  browserCacheControl: boolean;
  cacheStatus: CacheStatus;
  response: Response;
}

function withCacheStatus({ browserCacheControl, cacheStatus, response }: CacheStatusResponseInput): Response {
  const browserResponse = new Response(response.body, response);

  if (browserCacheControl && response.ok) {
    browserResponse.headers.set("Cache-Control", BROWSER_CACHE_CONTROL);
  }

  browserResponse.headers.set(CACHE_STATUS_HEADER, cacheStatus);

  return browserResponse;
}

function withEdgeCacheControl(response: Response, edgeTtlSeconds: number): Response {
  const edgeResponse = new Response(response.body, response);

  edgeResponse.headers.set("Cache-Control", `public, max-age=60, s-maxage=${edgeTtlSeconds}, must-revalidate`);

  return edgeResponse;
}

async function observeCachePut(putPromise: Promise<void>): Promise<void> {
  try {
    await putPromise;
  } catch (error) {
    console.error("Failed to populate public edge cache", error);
  }
}

async function populateEdgeCache({
  context,
  response,
}: {
  context: EdgeCacheContext;
  response: Response;
}): Promise<void> {
  try {
    // eslint-disable-next-line import/no-unresolved -- runtime module provided by workerd
    const { waitUntil } = await import("cloudflare:workers");
    const edgeResponse = withEdgeCacheControl(response.clone(), context.edgeTtlSeconds);
    const putPromise = context.cache.put(context.cacheKey, edgeResponse);

    waitUntil(observeCachePut(putPromise));
  } catch {
    // Cache API is unavailable in plain Vite dev; the rendered response remains valid.
  }
}

/**
 * Public edge cache keyed by tenant, path, and the tenant's opaque public-content version.
 * The stored copy gets a route-specific shared-cache TTL; callers always receive the short
 * browser-cache contract. Streaming responses are deliberately not deduplicated: sharing them
 * requires teeing the body, and an unread tee branch prevents Workers SSR streams from closing.
 */
export async function serveWithEdgeCache(
  request: Request,
  render: () => Response | Promise<Response>,
): Promise<Response> {
  const context = await resolveEdgeCacheContext(request);

  if (!context) {
    const response = await render();

    return withCacheStatus({ browserCacheControl: false, cacheStatus: "BYPASS", response });
  }

  try {
    const cached = await context.cache.match(context.cacheKey);

    if (cached) {
      return withCacheStatus({ browserCacheControl: true, cacheStatus: "HIT", response: cached });
    }
  } catch {
    // A cache read failure should not prevent rendering the public route.
  }

  const response = await render();

  if (response.ok && !response.headers.has("Set-Cookie")) {
    await populateEdgeCache({ context, response });
  }

  // `populateEdgeCache` consumes one clone while the caller consumes this original stream.
  // Do not clone this response again: an unread tee branch keeps Workers SSR streams alive.
  return withCacheStatus({ browserCacheControl: true, cacheStatus: "MISS", response });
}
