import { createFileRoute } from "@tanstack/react-router";

import { ContactPage } from "~/features/contact/pages/contact-page";
import { getPublicMenuQueryOptions } from "~/features/menu/api/public-menu-query-options";
import { buildPageHead } from "~/features/menu/seo/build-page-head";
import { buildRestaurantJsonLd } from "~/features/menu/seo/build-restaurant-json-ld";
import { BROWSER_CACHE_CONTROL } from "~/lib/browser-cache";

export const Route = createFileRoute("/{-$locale}/contacto")({
  loader: async ({ context, params }) =>
    context.queryClient.ensureQueryData(
      getPublicMenuQueryOptions({ host: context.tenant.host, locale: params.locale, trpc: context.trpc }),
    ),
  head: ({ loaderData, match }) =>
    buildPageHead({
      descriptionKey: "contact.seoDescription",
      jsonLd: loaderData
        ? buildRestaurantJsonLd({
            data: loaderData,
            includeMenu: false,
            origin: `https://${match.context.tenant.host}`,
          })
        : undefined,
      loaderData,
      match,
      path: "/contacto",
      titleKey: "contact.seoTitle",
    }),
  headers: () => ({
    "Cache-Control": BROWSER_CACHE_CONTROL,
  }),
  component: ContactPage,
});
