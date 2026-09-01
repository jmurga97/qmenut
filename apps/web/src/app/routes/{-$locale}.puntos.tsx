import { createFileRoute } from "@tanstack/react-router";

import { getLoyaltyProgramQueryOptions } from "~/features/loyalty/api/loyalty-query-options";
import { LoyaltyPage } from "~/features/loyalty/pages/loyalty-page";
import { getPublicMenuQueryOptions } from "~/features/menu/api/public-menu-query-options";
import { buildPageHead } from "~/features/menu/seo/build-page-head";
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
  head: ({ loaderData, match }) =>
    buildPageHead({
      descriptionKey: "loyalty.seoDescription",
      loaderData,
      match,
      noIndex: loaderData?.publicFeatures.loyalty === false,
      path: "/puntos",
      titleKey: "loyalty.seoTitle",
    }),
  headers: () => ({
    "Cache-Control": BROWSER_CACHE_CONTROL,
  }),
  component: LoyaltyPage,
});
