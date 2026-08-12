/**
 * qmenut public-menu service worker.
 *
 * The SSR document embeds the public menu data, so offline reading only needs cached
 * navigation documents and the same-origin, content-hashed assets they reference.
 */

const SW_VERSION = "2026-08-12.1";
const HTML_CACHE = `qm-html-${SW_VERSION}`;
const ASSET_CACHE = `qm-assets-${SW_VERSION}`;
const CURRENT_CACHES = new Set([HTML_CACHE, ASSET_CACHE]);

const OFFLINE_URLS = ["/offline", "/en/offline"];
const ASSET_PREFIX = "/assets/";
const HTML_CACHE_LIMIT = 20;

function navigationCacheKey(request) {
  const url = new URL(request.url);

  return new Request(new URL(url.pathname, url.origin));
}

async function trimHtmlCache() {
  const cache = await caches.open(HTML_CACHE);
  const keys = await cache.keys();

  for (const request of keys.slice(0, Math.max(0, keys.length - HTML_CACHE_LIMIT))) {
    await cache.delete(request);
  }
}

async function putInCache(cacheName, request, response) {
  if (!response.ok || response.type === "opaque") {
    return;
  }

  const cache = await caches.open(cacheName);

  await cache.put(request, response);

  if (cacheName === HTML_CACHE) {
    await trimHtmlCache();
  }
}

function buildOfflineUrl(requestUrl) {
  const url = new URL(requestUrl);
  const offlinePath = url.pathname === "/en" || url.pathname.startsWith("/en/") ? "/en/offline" : "/offline";
  const offlineUrl = new URL(offlinePath, url.origin);

  offlineUrl.searchParams.set("returnTo", `${url.pathname}${url.search}`);

  return offlineUrl;
}

async function handleNavigation(event) {
  const cacheKey = navigationCacheKey(event.request);

  try {
    const response = await fetch(event.request);

    event.waitUntil(putInCache(HTML_CACHE, cacheKey, response.clone()));

    return response;
  } catch {
    const cached = await caches.match(cacheKey);

    return cached ?? Response.redirect(buildOfflineUrl(event.request.url), 302);
  }
}

async function handleAsset(event) {
  const cached = await caches.match(event.request);

  if (cached) {
    return cached;
  }

  const response = await fetch(event.request);

  event.waitUntil(putInCache(ASSET_CACHE, event.request, response.clone()));

  return response;
}

async function precacheOfflineRoute(offlineUrl) {
  const response = await fetch(new Request(offlineUrl, { cache: "reload" }));

  if (!response.ok) {
    return;
  }

  const htmlCache = await caches.open(HTML_CACHE);
  const cacheKey = new Request(new URL(offlineUrl, self.location.origin));

  await htmlCache.put(cacheKey, response.clone());

  const html = await response.text();
  const assetCache = await caches.open(ASSET_CACHE);
  const assetPaths = [...new Set(html.match(/\/assets\/[\w.-]+\.(?:css|js|woff2)/g) ?? [])];

  await Promise.all(assetPaths.map((assetPath) => assetCache.add(assetPath).catch(() => undefined)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all(OFFLINE_URLS.map((offlineUrl) => precacheOfflineRoute(offlineUrl)))
      .catch((error) => {
        console.error("Offline precache failed", error);
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith("qm-") && !CURRENT_CACHES.has(name))
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event));

    return;
  }

  const url = new URL(request.url);

  if (url.origin === self.location.origin && url.pathname.startsWith(ASSET_PREFIX)) {
    event.respondWith(handleAsset(event));
  }
});
