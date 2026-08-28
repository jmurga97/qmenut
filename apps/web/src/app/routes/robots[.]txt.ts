import { createFileRoute } from "@tanstack/react-router";

import { ALLOW_INDEXING } from "~/lib/robots";
import { resolveSsrTenantHost } from "~/server/tenant-host";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => {
        if (!ALLOW_INDEXING) {
          return new Response("User-agent: *\nDisallow: /\n", {
            headers: { "content-type": "text/plain; charset=utf-8" },
          });
        }

        const host = resolveSsrTenantHost();

        if (!host) {
          return new Response("User-agent: *\nDisallow:\n", {
            headers: { "content-type": "text/plain; charset=utf-8" },
          });
        }

        const body = `User-agent: *\nAllow: /\nDisallow: /_server/\nDisallow: /offline\nSitemap: https://${host}/sitemap.xml\n`;

        return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
      },
    },
  },
});
