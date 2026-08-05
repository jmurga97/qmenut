import { createFileRoute, redirect } from "@tanstack/react-router";

import { LegalNoticePage } from "~/features/legal/pages/legal-notice-page";
import { getPublicMenuQueryOptions } from "~/features/menu/api/public-menu-query-options";
import { buildPageHead } from "~/features/menu/seo/build-page-head";
import { BROWSER_CACHE_CONTROL } from "~/lib/browser-cache";

export const Route = createFileRoute("/{-$locale}/aviso-legal")({
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
  head: ({ loaderData, match }) =>
    buildPageHead({
      allowedLocales: ["es", "en"],
      descriptionKey: "legal.legalNotice.seoDescription",
      loaderData,
      match,
      path: "/aviso-legal",
      titleKey: "legal.legalNotice.seoTitle",
    }),
  headers: () => ({
    "Cache-Control": BROWSER_CACHE_CONTROL,
  }),
  component: LegalNoticePage,
});
