import { createFileRoute } from "@tanstack/react-router";

import { buildPageHead } from "~/features/menu/seo/build-page-head";
import { ReservationsPage } from "~/features/reservations/pages/reservations-page";
import { getPublicMenuQueryOptions } from "~/shared/public-menu/public-menu-query-options";

export const Route = createFileRoute("/{-$locale}/reservar")({
  loader: async ({ context, params }) =>
    context.queryClient.query({
      ...getPublicMenuQueryOptions({ host: context.tenant.host, locale: params.locale, trpc: context.trpc }),
      staleTime: "static",
    }),
  head: ({ loaderData, match }) =>
    buildPageHead({
      descriptionKey: "reservations.seoDescription",
      loaderData,
      match,
      noIndex: loaderData?.publicFeatures.reservations === false,
      path: "/reservar",
      titleKey: "reservations.seoTitle",
    }),
  component: ReservationsPage,
});
