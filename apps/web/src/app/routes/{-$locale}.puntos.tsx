import { createFileRoute } from "@tanstack/react-router";

import { FidelityPage } from "~/features/fidelity/pages/fidelity-page";
import { getPublicMenuQueryOptions } from "~/features/menu/api/public-menu-query-options";
import { buildHreflangAlternates } from "~/features/menu/seo/build-hreflang-alternates";
import { ISR_CACHE_CONTROL } from "~/lib/isr";

export const Route = createFileRoute("/{-$locale}/puntos")({
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
    const title = `Puntos de fidelidad – ${loaderData.branch.name}`;
    const description = `Programa de puntos y fidelidad de ${loaderData.branch.name}`;

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
        ...buildHreflangAlternates({ language: loaderData.language, origin, path: "/puntos" }).map(
          ({ hreflang, href }) => ({ rel: "alternate", hrefLang: hreflang, href }),
        ),
      ],
    };
  },
  headers: () => ({
    "Cache-Control": ISR_CACHE_CONTROL,
  }),
  component: FidelityPage,
});
