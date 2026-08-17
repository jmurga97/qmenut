import { createRootRouteWithContext, HeadContent, Outlet, Scripts, useRouterState } from "@tanstack/react-router";
import { I18nextProvider } from "react-i18next";

import { FONT_CSS_URLS, getFontPreloadUrl, resolveTenantFontIds } from "~/app/fonts/font-css";
import appCss from "~/app/styles.css?url";
import { DEFAULT_LOCALE } from "~/lib/i18n/create-i18n";
import { getCachedTenantContext } from "~/server/tenant-theme";

import type { ReactNode } from "react";
import type { RouterAppContext } from "~/lib/trpc-client";

function RootRouteComponent() {
  const { i18n } = Route.useRouteContext();

  return (
    <I18nextProvider i18n={i18n}>
      <RootDocument>
        <Outlet />
      </RootDocument>
    </I18nextProvider>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  const effectiveLocale = useRouterState({
    select: (state) => state.matches.find((match) => match.routeId === "/{-$locale}")?.context.effectiveLocale,
  });

  return (
    <html lang={effectiveLocale ?? DEFAULT_LOCALE}>
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  beforeLoad: async () => {
    const tenant = await getCachedTenantContext();

    return { tenant };
  },
  head: ({ match }) => {
    const { theme } = match.context.tenant;
    const { heading, body } = resolveTenantFontIds(theme);
    const familyIds = [...new Set([heading, body])];
    const preloadUrls = [...new Set([getFontPreloadUrl(heading, theme.headingWeight), getFontPreloadUrl(body, 400)])];

    return {
      meta: [
        { charSet: "utf8" },
        // Required for the bottom navigation's safe-area insets in standalone mode.
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "robots", content: "index,follow,max-image-preview:large" },
        { name: "theme-color", content: theme.primary },
        { name: "mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
      ],
      links: [
        { rel: "icon", href: "/favicon.ico", sizes: "any" },
        { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
        // iOS ignores manifest icons for Add to Home Screen; this route redirects to the
        // tenant logo, or to the committed raster when the branch has none.
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
        { rel: "manifest", href: "/site.webmanifest" },
        { rel: "preconnect", href: "https://images.unsplash.com", crossOrigin: "anonymous" },
        ...familyIds.map((fontId) => ({ rel: "stylesheet", href: FONT_CSS_URLS[fontId] })),
        ...preloadUrls.map((href) => ({
          rel: "preload",
          href,
          as: "font",
          type: "font/woff2",
          crossOrigin: "anonymous",
        })),
        { rel: "stylesheet", href: appCss },
      ],
    };
  },
  component: RootRouteComponent,
});
