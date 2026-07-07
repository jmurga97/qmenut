import { createFileRoute } from "@tanstack/react-router";

import { getPublicMenuQueryOptions } from "~/features/menu/api/public-menu-query-options";
import { MenuPage } from "~/features/menu/pages/menu-page";
import { buildHreflangAlternates } from "~/features/menu/seo/build-hreflang-alternates";
import { buildRestaurantJsonLd } from "~/features/menu/seo/build-restaurant-json-ld";
import { ISR_CACHE_CONTROL } from "~/lib/isr";
import { PublicPageSkeleton } from "~/shared/components/public-page-skeleton";

import type { PublicMenuData } from "~/features/menu/api/public-menu-types";

function buildMenuDescription(data: PublicMenuData): string {
  const firstDescription = data.categories
    .flatMap((category) => [category.description, ...category.dishes.map((dish) => dish.description)])
    .find((description): description is string => Boolean(description?.trim()));

  if (firstDescription) {
    return firstDescription.slice(0, 155);
  }

  return data.branch.address ? `${data.branch.name} – ${data.branch.address}` : `Carta de ${data.branch.name}`;
}

export const Route = createFileRoute("/{-$locale}/")({
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
    const title = loaderData.branch.name;
    const description = buildMenuDescription(loaderData);
    const image = loaderData.branch.photos[0]?.url;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: canonicalUrl },
        ...(image ? [{ property: "og:image", content: image }] : []),
        { "script:ld+json": buildRestaurantJsonLd({ data: loaderData, origin }) },
      ],
      links: [
        { rel: "canonical", href: canonicalUrl },
        ...buildHreflangAlternates({ language: loaderData.language, origin, path: "/" }).map(({ hreflang, href }) => ({
          rel: "alternate",
          hrefLang: hreflang,
          href,
        })),
      ],
    };
  },
  headers: () => ({
    "Cache-Control": ISR_CACHE_CONTROL,
  }),
  pendingComponent: PublicPageSkeleton,
  component: MenuPage,
});
