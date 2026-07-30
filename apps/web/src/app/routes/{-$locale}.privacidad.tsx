import { createFileRoute, redirect } from "@tanstack/react-router";

import { PrivacyPage } from "~/features/legal/pages/privacy-page";
import { getPublicMenuQueryOptions } from "~/features/menu/api/public-menu-query-options";
import { buildHreflangAlternates } from "~/features/menu/seo/build-hreflang-alternates";
import { BROWSER_CACHE_CONTROL } from "~/lib/browser-cache";

export const Route = createFileRoute("/{-$locale}/privacidad")({
  beforeLoad: ({ params }) => {
    const locale = params.locale?.toLowerCase();

    if (locale && locale !== "en" && locale !== "es") {
      redirect({ to: ".", params: { locale: "es" }, throw: true });
    }
  },
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
    const title = match.context.i18n.t("legal.privacy.seoTitle", { name: loaderData.branch.name });
    const description = match.context.i18n.t("legal.privacy.seoDescription", { name: loaderData.branch.name });

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
        ...buildHreflangAlternates({
          allowedLocales: ["es", "en"],
          language: loaderData.language,
          origin,
          path: "/privacidad",
        }).map(({ hreflang, href }) => ({ rel: "alternate", hrefLang: hreflang, href })),
      ],
    };
  },
  headers: () => ({
    "Cache-Control": BROWSER_CACHE_CONTROL,
  }),
  component: PrivacyPage,
});
