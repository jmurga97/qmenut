/**
 * Registration is skipped in dev on purpose: the Vite dev server serves unhashed module URLs,
 * and a stale service-worker cache there produces HMR failures that look like app bugs.
 * Test the worker against the built Worker (`bun run --cwd apps/web serve`, port 4011).
 */
export function registerServiceWorker(): void {
  if (import.meta.env.DEV || typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((error: unknown) => {
      console.error("Service worker registration failed", error);
    });
  });
}
