import { createFileRoute } from "@tanstack/react-router";

import { resolveSsrTenantHost } from "~/server/tenant-host";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        const host = await resolveSsrTenantHost();
        const body = `User-agent: *\nAllow: /\nSitemap: https://${host}/sitemap.xml\n`;

        return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
      },
    },
  },
});
