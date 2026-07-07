import { createFileRoute } from "@tanstack/react-router";

import { buildHreflangAlternates } from "~/features/menu/seo/build-hreflang-alternates";
import { createServerTrpcCaller } from "~/lib/trpc-client";
import { resolveSsrTenantHost } from "~/server/tenant-host";

const ROUTE_PATHS = ["/", "/contacto", "/promos", "/puntos"];

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const host = await resolveSsrTenantHost();
        const origin = `https://${host}`;
        const trpc = createServerTrpcCaller();
        const data = await trpc.menu.publicData.query({ host });

        if (!data) {
          return new Response("Not found", { status: 404 });
        }

        const urlEntries = ROUTE_PATHS.map((path) => {
          const alternates = buildHreflangAlternates({ language: data.language, origin, path });
          const defaultHref = alternates.find((alt) => alt.hreflang === "x-default")?.href ?? origin + path;
          const alternateLinks = alternates
            .map(
              (alt) =>
                `    <xhtml:link rel="alternate" hreflang="${escapeXml(alt.hreflang)}" href="${escapeXml(alt.href)}" />`,
            )
            .join("\n");

          return `  <url>
    <loc>${escapeXml(defaultHref)}</loc>
${alternateLinks}
  </url>`;
        });

        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries.join("\n")}
</urlset>
`;

        return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8" } });
      },
    },
  },
});
