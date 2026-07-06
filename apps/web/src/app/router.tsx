import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { routeTree } from "~/app/route-tree.gen";
import { createI18nInstance } from "~/lib/i18n/create-i18n";
import { createTrpcOptionsProxy } from "~/lib/trpc-client";

function createQueryClient() {
  return new QueryClient();
}

export function getRouter() {
  const queryClient = createQueryClient();
  const trpc = createTrpcOptionsProxy(queryClient);
  // Fresh instance per request/router creation — avoids leaking language state across
  // concurrent SSR requests in the Workers runtime.
  const i18n = createI18nInstance(undefined);

  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    context: {
      queryClient,
      trpc,
      i18n,
    },
  });

  setupRouterSsrQueryIntegration({
    queryClient,
    router,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
