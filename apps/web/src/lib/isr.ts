// Edge caching is now handled explicitly by the Cache API wrapper in
// `~/server/edge-cache.ts`, keyed on a per-tenant `menuVersion` rather than a TTL — this
// header only governs the browser's own cache of that already-served response.
export const ISR_CACHE_CONTROL = "public, max-age=60, must-revalidate";
