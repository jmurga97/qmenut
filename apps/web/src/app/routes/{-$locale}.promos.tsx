import { createFileRoute } from "@tanstack/react-router";

import { getPublicMenuQueryOptions } from "~/features/menu/api/public-menu-query-options";
import { buildPageHead } from "~/features/menu/seo/build-page-head";
import { buildPromotionsJsonLd } from "~/features/menu/seo/build-promotions-json-ld";
import { PromosPage } from "~/features/promos/pages/promos-page";
import { BROWSER_CACHE_CONTROL } from "~/lib/browser-cache";

export const Route = createFileRoute("/{-$locale}/promos")({
  loader: async ({ context, params }) =>
    context.queryClient.ensureQueryData(
      getPublicMenuQueryOptions({ host: context.tenant.host, locale: params.locale, trpc: context.trpc }),
    ),
  head: ({ loaderData, match }) =>
    buildPageHead({
      descriptionKey: "promos.seoDescription",
      jsonLd: loaderData ? buildPromotionsJsonLd(loaderData) : undefined,
      loaderData,
      match,
      path: "/promos",
      titleKey: "promos.seoTitle",
    }),
  headers: () => ({
    "Cache-Control": BROWSER_CACHE_CONTROL,
  }),
  component: PromosPage,
});
