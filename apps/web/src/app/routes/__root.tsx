import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

import type { RouterAppContext } from "../lib/trpc-client";
import type { ReactNode } from "react";

function RootRouteComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
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
