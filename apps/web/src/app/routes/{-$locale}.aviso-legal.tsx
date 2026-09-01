import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { isLegalCountryCode } from "~/features/legal/legal-content";
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
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(
      getPublicMenuQueryOptions({ host: context.tenant.host, locale: params.locale, trpc: context.trpc }),
    );

    // Los países sin plantilla legal degradan a 404 en el loader (no en render):
    // el guardia de create-tenant.ts vive fuera del camino de render.
    if (data && !isLegalCountryCode(data.countryCode)) {
      notFound({ throw: true });
    }

    return data;
  },
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
