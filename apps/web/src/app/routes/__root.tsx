import { createRootRouteWithContext, HeadContent, Outlet, Scripts, useRouterState } from "@tanstack/react-router";
import { I18nextProvider } from "react-i18next";

import fontsCss from "~/app/fonts.css?url";
import appCss from "~/app/styles.css?url";
import { DEFAULT_LOCALE } from "~/lib/i18n/create-i18n";
import { getTenantContext } from "~/server/tenant-theme";
import { useRegisterQmComponents } from "~/shared/hooks/use-register-qm-components";

import type { ReactNode } from "react";
import type { RouterAppContext } from "~/lib/trpc-client";

function RootRouteComponent() {
  useRegisterQmComponents();

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
    select: (state) =>
      state.matches.find((match) => match.routeId === "/{-$locale}")?.context.effectiveLocale as
        | string
        | undefined,
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
    const tenant = await getTenantContext();

    return { tenant };
  },
  head: () => ({
    meta: [{ charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" }],
    links: [
      { rel: "stylesheet", href: fontsCss },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  component: RootRouteComponent,
});
