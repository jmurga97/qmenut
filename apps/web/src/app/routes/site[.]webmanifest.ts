import { createFileRoute } from "@tanstack/react-router";

import { createServerTrpcCaller } from "~/lib/trpc-client";
import { buildWebManifest } from "~/server/pwa/build-web-manifest";
import { resolveSsrTenantHost } from "~/server/tenant-host";
import { readTenantTheme } from "~/server/tenant-theme";

export const Route = createFileRoute("/site.webmanifest")({
  server: {
    handlers: {
      GET: async () => {
        const host = resolveSsrTenantHost();

        if (!host) {
          return new Response("Not found", { status: 404 });
        }

        const trpc = createServerTrpcCaller();
        const [data, theme] = await Promise.all([trpc.menu.publicData.query({ host }), readTenantTheme(host)]);

        if (!data) {
          return new Response("Not found", { status: 404 });
        }

        return new Response(JSON.stringify(buildWebManifest({ data, theme }), null, 2), {
          headers: { "content-type": "application/manifest+json; charset=utf-8" },
        });
      },
    },
  },
});
