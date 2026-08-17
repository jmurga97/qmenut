import { createFileRoute } from "@tanstack/react-router";

import { createServerTrpcCaller } from "~/lib/trpc-client";
import { resolveSsrTenantHost } from "~/server/tenant-host";

const FALLBACK_ICON_PATH = "/icons/apple-touch-icon-180.png";

/**
 * iOS ignores manifest icons for Add to Home Screen and demands a raster from
 * `<link rel="apple-touch-icon">` (SVG is not supported). Redirecting keeps the link href
 * constant, so the root route needs no per-branch data to emit it.
 */
export const Route = createFileRoute("/apple-touch-icon.png")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const host = resolveSsrTenantHost();

        if (!host) {
          return Response.redirect(new URL(FALLBACK_ICON_PATH, request.url), 302);
        }

        const trpc = createServerTrpcCaller();
        const data = await trpc.menu.publicData.query({ host });
        const logoUrl = data?.branch.logoUrl;

        return Response.redirect(logoUrl ?? new URL(FALLBACK_ICON_PATH, request.url).href, 302);
      },
    },
  },
});
