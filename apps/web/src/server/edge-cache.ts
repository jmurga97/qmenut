import { env } from "cloudflare:workers";

import { BROWSER_CACHE_CONTROL } from "~/lib/browser-cache";
import { LOCALE_PATTERN } from "~/lib/i18n/locale-pattern";
import { resolveRequestTenantHost } from "~/server/tenant-host";

const PROMOTION_EDGE_TTL_SECONDS = 15 * 60;
const DEFAULT_EDGE_TTL_SECONDS = 24 * 60 * 60;
const STALE_WINDOW_SECONDS = 24 * 60 * 60;
// Legacy KV key prefix retained to avoid migrating existing tenant version entries.
const LEGACY_CONTENT_VERSION_KEY_PREFIX = "menuVersion:";
// Legacy query parameter retained so previously generated edge-cache keys remain compatible.
const LEGACY_CONTENT_VERSION_QUERY_PARAM = "menuVersion";
const CACHE_STATUS_HEADER = "X-QMenut-Cache";
const FRESH_UNTIL_HEADER = "x-qmenut-fresh-until";
const CACHEABLE_ROUTES = new Set([
  "",
  "contacto",
  "destacados",
  "puntos",
  "aviso-legal",
  "privacidad",
  "offline",
  "robots.txt",
  "sitemap.xml",
  "site.webmanifest",
  "icon.svg",
  "icon-maskable.svg",
  "apple-touch-icon.png",
]);
const revalidations = new Map<string, Promise<void>>();

type CacheStatus = "BYPASS" | "HIT" | "MISS" | "STALE";

async function readPublicContentVersion(host: string): Promise<string | null> {
  return (await env.TENANT_THEME?.get(`${LEGACY_CONTENT_VERSION_KEY_PREFIX}${host}`)) ?? null;
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

  return route === "" || route === "destacados" ? PROMOTION_EDGE_TTL_SECONDS : DEFAULT_EDGE_TTL_SECONDS;
}

interface EdgeCacheContext {
  cache: Cache;
  cacheKey: Request;
  edgeTtlSeconds: number;
}

/** Resolves the per-tenant cache key and policy for public HTML and crawler routes. */
async function resolveEdgeCacheContext(request: Request): Promise<EdgeCacheContext | null> {
  if (request.method !== "GET") {
    return null;
  }

  const url = new URL(request.url);
  const edgeTtlSeconds = getEdgeTtlSeconds(url.pathname);

  if (edgeTtlSeconds === null) {
    return null;
  }

  const host = resolveRequestTenantHost(request);

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

  browserResponse.headers.delete(FRESH_UNTIL_HEADER);
  browserResponse.headers.set(CACHE_STATUS_HEADER, cacheStatus);

  return browserResponse;
}

function withEdgeCacheControl(response: Response, edgeTtlSeconds: number): Response {
  const edgeResponse = new Response(response.body, response);

  edgeResponse.headers.set(
    "Cache-Control",
    `public, max-age=60, s-maxage=${edgeTtlSeconds + STALE_WINDOW_SECONDS}, must-revalidate`,
  );
  edgeResponse.headers.set(FRESH_UNTIL_HEADER, String(Date.now() + edgeTtlSeconds * 1000));

  return edgeResponse;
}

async function observeCachePut(putPromise: Promise<void>): Promise<void> {
  try {
    await putPromise;
  } catch (error) {
    console.error("Failed to populate public edge cache", error);
  }
}

interface PopulateEdgeCacheInput {
  context: EdgeCacheContext;
  ctx: ExecutionContext;
  response: Response;
}

function populateEdgeCache({ context, ctx, response }: PopulateEdgeCacheInput): void {
  const edgeResponse = withEdgeCacheControl(response.clone(), context.edgeTtlSeconds);
  const putPromise = context.cache.put(context.cacheKey, edgeResponse);

  ctx.waitUntil(observeCachePut(putPromise));
}

interface RevalidateInput {
  context: EdgeCacheContext;
  render: () => Response | Promise<Response>;
}

async function revalidate({ context, render }: RevalidateInput): Promise<void> {
  try {
    const response = await render();

    if (!response.ok || response.headers.has("Set-Cookie")) {
      return;
    }

    // Only the cache consumes this background-rendered stream, so no clone/tee is needed.
    await context.cache.put(context.cacheKey, withEdgeCacheControl(response, context.edgeTtlSeconds));
  } catch (error) {
    console.error("Failed to revalidate public edge cache", error);
  }
}

interface ScheduleRevalidationInput extends RevalidateInput {
  ctx: ExecutionContext;
}

function scheduleRevalidation({ context, ctx, render }: ScheduleRevalidationInput): void {
  const key = context.cacheKey.url;

  if (revalidations.has(key)) {
    return;
  }

  const promise = (async () => {
    try {
      await revalidate({ context, render });
    } finally {
      revalidations.delete(key);
    }
  })();

  revalidations.set(key, promise);
  ctx.waitUntil(promise);
}

async function matchEdgeCache(context: EdgeCacheContext): Promise<Response | null> {
  try {
    return (await context.cache.match(context.cacheKey)) ?? null;
  } catch {
    // A cache read failure should not prevent rendering the public route.
    return null;
  }
}

interface ServeWithEdgeCacheInput {
  ctx: ExecutionContext;
  render: () => Response | Promise<Response>;
  request: Request;
}

/**
 * Public edge cache keyed by tenant, path, and the tenant's opaque public-content version.
 * Fresh entries are served directly; stale entries are served immediately and revalidated in
 * the background. Callers always receive the short browser-cache contract.
 */
export async function serveWithEdgeCache({ ctx, render, request }: ServeWithEdgeCacheInput): Promise<Response> {
  const context = await resolveEdgeCacheContext(request);

  if (!context) {
    const response = await render();

    return withCacheStatus({ browserCacheControl: false, cacheStatus: "BYPASS", response });
  }

  const cached = await matchEdgeCache(context);

  if (cached) {
    const freshUntil = Number(cached.headers.get(FRESH_UNTIL_HEADER));

    if (Number.isFinite(freshUntil) && Date.now() < freshUntil) {
      return withCacheStatus({ browserCacheControl: true, cacheStatus: "HIT", response: cached });
    }

    scheduleRevalidation({ context, ctx, render });

    // Cloning a cached response is safe because its body is already buffered.
    return withCacheStatus({ browserCacheControl: true, cacheStatus: "STALE", response: cached });
  }

  const response = await render();

  if (response.ok && !response.headers.has("Set-Cookie")) {
    populateEdgeCache({ context, ctx, response });
  }

  // `populateEdgeCache` consumes one clone while the caller consumes this original stream.
  // Do not clone this response again: an unread tee branch keeps Workers SSR streams alive.
  return withCacheStatus({ browserCacheControl: true, cacheStatus: "MISS", response });
}
