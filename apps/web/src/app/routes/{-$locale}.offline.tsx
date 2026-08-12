import { createFileRoute } from "@tanstack/react-router";

import { OfflinePage } from "~/features/offline/pages/offline-page";
import { BROWSER_CACHE_CONTROL } from "~/lib/browser-cache";

interface OfflineSearch {
  returnTo?: string;
}

function parseReturnTo(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith("/") || value.startsWith("//")) {
    return undefined;
  }

  const validationOrigin = "https://qmenut.invalid";

  try {
    const url = new URL(value, validationOrigin);

    if (url.origin !== validationOrigin || url.pathname === "/offline" || url.pathname === "/en/offline") {
      return undefined;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return undefined;
  }
}

export const Route = createFileRoute("/{-$locale}/offline")({
  validateSearch: (search: Record<string, unknown>): OfflineSearch => ({
    returnTo: parseReturnTo(search.returnTo),
  }),
  head: () => ({
    meta: [{ name: "robots", content: "noindex,nofollow" }],
  }),
  headers: () => ({
    "Cache-Control": BROWSER_CACHE_CONTROL,
  }),
  component: OfflinePage,
});
