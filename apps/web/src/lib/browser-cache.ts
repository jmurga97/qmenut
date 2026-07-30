/**
 * Browser-only cache policy. Public routes also declare it as a fallback for local Vite
 * development, where the Cloudflare Cache API wrapper is unavailable. In production the
 * wrapper restores this value after using a separate `s-maxage` policy for the edge copy.
 */
export const BROWSER_CACHE_CONTROL = "public, max-age=60, must-revalidate";
