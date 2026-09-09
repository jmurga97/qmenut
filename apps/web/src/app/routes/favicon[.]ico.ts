import { createFileRoute } from "@tanstack/react-router";

import { createServerTrpcCaller } from "~/lib/trpc-client";
import { resolveSsrTenantHost } from "~/server/tenant-host";

const FALLBACK_ICON_PATH = "/icons/favicon-default.ico";

/**
 * Legacy clients and crawlers request /favicon.ico directly, so the href in __root stays
 * constant while this route redirects to the tenant logo's ICO variant, or to the committed
 * default icon when the branch has no logo yet.
 */
export const Route = createFileRoute("/favicon.ico")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const host = resolveSsrTenantHost();

        if (!host) {
          return Response.redirect(new URL(FALLBACK_ICON_PATH, request.url), 302);
        }

        const trpc = createServerTrpcCaller();
        const data = await trpc.menu.publicData.query({ host });
        const faviconUrl = data?.branch.faviconUrl;

        return Response.redirect(faviconUrl ?? new URL(FALLBACK_ICON_PATH, request.url).href, 302);
      },
    },
  },
});
