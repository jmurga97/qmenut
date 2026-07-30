import { createFileRoute } from "@tanstack/react-router";

import { getLoyaltyProgramQueryOptions } from "~/features/loyalty/api/loyalty-query-options";
import { LoyaltyPage } from "~/features/loyalty/pages/loyalty-page";
import { getPublicMenuQueryOptions } from "~/features/menu/api/public-menu-query-options";
import { buildHreflangAlternates } from "~/features/menu/seo/build-hreflang-alternates";
import { BROWSER_CACHE_CONTROL } from "~/lib/browser-cache";

export const Route = createFileRoute("/{-$locale}/puntos")({
  loader: async ({ context, params }) => {
    const menu = await context.queryClient.ensureQueryData(
      getPublicMenuQueryOptions({ host: context.tenant.host, locale: params.locale, trpc: context.trpc }),
    );
    await context.queryClient.ensureQueryData(
      getLoyaltyProgramQueryOptions({ host: context.tenant.host, trpc: context.trpc }),
    );
    return menu;
  },
  head: ({ loaderData, match }) => {
    if (!loaderData) {
      return {};
    }

    const origin = `https://${match.context.tenant.host}`;
    const canonicalUrl = `${origin}${match.pathname}`;
    const english = loaderData.language.effective.startsWith("en");
    const title = english ? `Loyalty rewards – ${loaderData.branch.name}` : `Fidelización – ${loaderData.branch.name}`;
    const description = english
      ? `Loyalty card and rewards from ${loaderData.branch.name}`
      : `Tarjeta de fidelización y premios de ${loaderData.branch.name}`;

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
    "Cache-Control": BROWSER_CACHE_CONTROL,
  }),
  component: LoyaltyPage,
});
