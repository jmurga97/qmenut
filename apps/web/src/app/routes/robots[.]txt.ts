import { createFileRoute } from "@tanstack/react-router";

import { resolveSsrTenantHost } from "~/server/tenant-host";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => {
        const host = resolveSsrTenantHost();

        if (!host) {
          return new Response("User-agent: *\nDisallow:\n", {
            headers: { "content-type": "text/plain; charset=utf-8" },
          });
        }

        const body = `User-agent: *\nAllow: /\nDisallow: /_server/\nSitemap: https://${host}/sitemap.xml\n`;

        return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
      },
    },
  },
});
