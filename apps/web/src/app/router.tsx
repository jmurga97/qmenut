import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { routeTree } from "~/app/route-tree.gen";
import { createTrpcOptionsProxy } from "~/lib/trpc-client";

function createQueryClient() {
  return new QueryClient();
}

export function getRouter() {
  const queryClient = createQueryClient();
  const trpc = createTrpcOptionsProxy(queryClient);

  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    context: {
      queryClient,
      trpc,
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
