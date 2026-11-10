import { createFileRoute } from "@tanstack/react-router";

import { buildHreflangAlternates } from "~/features/menu/seo/build-hreflang-alternates";
import { hasHighlights } from "~/features/promos/mappers/map-recommended-content";
import { createServerTrpcCaller } from "~/lib/trpc-client";
import { resolveSsrTenantHost } from "~/server/tenant-host";

// Only pages with searchable content; legal pages and the loyalty card are `noindex`.
const ROUTE_PATHS = ["/", "/contacto", "/destacados", "/reservar"] as const;
const CONTENT_VERSION_KEY_PREFIX = "menuVersion:";

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

async function readLastModified(host: string): Promise<string | null> {
  if (!import.meta.env.SSR) {
    return null;
  }

  const { env } = await import("cloudflare:workers");
  const version = await env.TENANT_THEME?.get(`${CONTENT_VERSION_KEY_PREFIX}${host}`);
  const timestamp = Number(version);

  return Number.isFinite(timestamp) && timestamp > 0 ? new Date(timestamp).toISOString() : null;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const host = resolveSsrTenantHost();

        if (!host) {
          return new Response("Not found", { status: 404 });
        }

        const origin = `https://${host}`;
        const trpc = createServerTrpcCaller();
        const [data, lastModified] = await Promise.all([trpc.menu.publicData.query({ host }), readLastModified(host)]);

        if (!data) {
          return new Response("Not found", { status: 404 });
        }

        const publicRoutePaths = ROUTE_PATHS.filter(
          (path) =>
            (path !== "/reservar" || data.publicFeatures.reservations) &&
            (path !== "/destacados" || (data.publicFeatures.highlights && hasHighlights(data))),
        );
        // One <url> per language version, each repeating the full alternate set.
        const urlEntries = publicRoutePaths.flatMap((path) => {
          const alternates = buildHreflangAlternates({ language: data.language, origin, path });
          const alternateLinks = alternates
            .map(
              (alt) =>
                `    <xhtml:link rel="alternate" hreflang="${escapeXml(alt.hreflang)}" href="${escapeXml(alt.href)}" />`,
            )
            .join("\n");

          return alternates
            .filter((alt) => alt.hreflang !== "x-default")
            .map(
              (alt) => `  <url>
    <loc>${escapeXml(alt.href)}</loc>
${lastModified ? `    <lastmod>${lastModified}</lastmod>\n` : ""}${alternateLinks}
  </url>`,
            );
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
