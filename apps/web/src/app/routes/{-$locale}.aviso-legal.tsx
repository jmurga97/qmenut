import { createFileRoute } from "@tanstack/react-router";

import { LegalNoticePage } from "~/features/legal/pages/legal-notice-page";
import { getPublicMenuQueryOptions } from "~/features/menu/api/public-menu-query-options";
import { buildHreflangAlternates } from "~/features/menu/seo/build-hreflang-alternates";
import { ISR_CACHE_CONTROL } from "~/lib/isr";

export const Route = createFileRoute("/{-$locale}/aviso-legal")({
  loader: async ({ context, params }) =>
    context.queryClient.ensureQueryData(
      getPublicMenuQueryOptions({ host: context.tenant.host, locale: params.locale, trpc: context.trpc }),
    ),
  head: ({ loaderData, match }) => {
    if (!loaderData) {
      return {};
    }

    const origin = `https://${match.context.tenant.host}`;
    const canonicalUrl = `${origin}${match.pathname}`;
    const title = `Aviso legal – ${loaderData.branch.name}`;
    const description = `Aviso legal e información del titular de ${loaderData.branch.name}`;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: canonicalUrl },
      ],
      links: [
        { rel: "canonical", href: canonicalUrl },
        ...buildHreflangAlternates({ language: loaderData.language, origin, path: "/aviso-legal" }).map(
          ({ hreflang, href }) => ({ rel: "alternate", hrefLang: hreflang, href }),
        ),
      ],
    };
  },
  headers: () => ({
    "Cache-Control": ISR_CACHE_CONTROL,
  }),
  component: LegalNoticePage,
});
