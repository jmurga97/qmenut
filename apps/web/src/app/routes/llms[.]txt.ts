import { createFileRoute } from "@tanstack/react-router";

import { buildLlmsTxt } from "~/features/menu/seo/build-llms-txt";
import { createServerTrpcCaller } from "~/lib/trpc-client";
import { resolveSsrTenantHost } from "~/server/tenant-host";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        const host = resolveSsrTenantHost();
        const data = host ? await createServerTrpcCaller().menu.publicData.query({ host }) : null;

        if (!data) {
          return new Response("Not found", { status: 404 });
        }

        return new Response(buildLlmsTxt({ data, origin: `https://${host}` }), {
          headers: { "content-type": "text/markdown; charset=utf-8" },
        });
      },
    },
  },
});
