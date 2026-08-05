import { createFileRoute } from "@tanstack/react-router";

import { getPublicMenuQueryOptions } from "~/features/menu/api/public-menu-query-options";
import { MenuPage } from "~/features/menu/pages/menu-page";
import { buildPageHead } from "~/features/menu/seo/build-page-head";
import { buildRestaurantJsonLd } from "~/features/menu/seo/build-restaurant-json-ld";
import { BROWSER_CACHE_CONTROL } from "~/lib/browser-cache";
import { PublicPageSkeleton } from "~/shared/components/public-page-skeleton";

export const Route = createFileRoute("/{-$locale}/")({
  loader: async ({ context, params }) =>
    context.queryClient.ensureQueryData(
      getPublicMenuQueryOptions({ host: context.tenant.host, locale: params.locale, trpc: context.trpc }),
    ),
  head: ({ loaderData, match }) =>
    buildPageHead({
      jsonLd: loaderData
        ? buildRestaurantJsonLd({ data: loaderData, origin: `https://${match.context.tenant.host}` })
        : undefined,
      loaderData,
      match,
      path: "/",
    }),
  headers: () => ({
    "Cache-Control": BROWSER_CACHE_CONTROL,
  }),
  pendingComponent: PublicPageSkeleton,
  component: MenuPage,
});
