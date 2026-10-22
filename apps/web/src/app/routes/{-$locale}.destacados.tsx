import { createFileRoute, redirect } from "@tanstack/react-router";

import { buildPageHead } from "~/features/menu/seo/build-page-head";
import { buildPromotionsJsonLd } from "~/features/menu/seo/build-promotions-json-ld";
import { HighlightsPage } from "~/features/promos/pages/highlights-page";
import { BROWSER_CACHE_CONTROL } from "~/lib/browser-cache";
import { getPublicMenuQueryOptions } from "~/shared/public-menu/public-menu-query-options";

export const Route = createFileRoute("/{-$locale}/destacados")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.query({
      ...getPublicMenuQueryOptions({ host: context.tenant.host, locale: params.locale, trpc: context.trpc }),
      staleTime: "static",
    });
    // Old links and QR codes keep working on plans without highlights.
    if (data && !data.publicFeatures.highlights) redirect({ to: "/{-$locale}", params, throw: true });
    return data;
  },
  head: ({ loaderData, match }) =>
    buildPageHead({
      descriptionKey: "destacados.seoDescription",
      jsonLd: loaderData ? buildPromotionsJsonLd(loaderData) : undefined,
      loaderData,
      match,
      path: "/destacados",
      titleKey: "destacados.seoTitle",
    }),
  headers: () => ({
    "Cache-Control": BROWSER_CACHE_CONTROL,
  }),
  component: HighlightsPage,
});
