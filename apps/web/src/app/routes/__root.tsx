import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router";

import appCss from "~/app/styles.css?url";
import { useRegisterQmComponents } from "~/shared/hooks/use-register-qm-components";

import type { ReactNode } from "react";
import type { RouterAppContext } from "~/lib/trpc-client";

function RootRouteComponent() {
  useRegisterQmComponents();

  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
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
  head: () => ({
    meta: [{ charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" }],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootRouteComponent,
});
