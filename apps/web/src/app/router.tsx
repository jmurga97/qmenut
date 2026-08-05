import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { routeTree } from "~/app/route-tree.gen";
import { createI18nInstance } from "~/lib/i18n/create-i18n";
import { createTrpcOptionsProxy } from "~/lib/trpc-client";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
      },
    },
  });
}

export function getRouter() {
  const queryClient = createQueryClient();
  const trpc = createTrpcOptionsProxy(queryClient);
  // Fresh instance per request/router creation — avoids leaking language state across
  // concurrent SSR requests in the Workers runtime. On the client, seed it from the
  // SSR-rendered `<html lang>` (set in __root.tsx from the resolved `effectiveLocale`) so the
  // first hydration render already matches the server; `/{-$locale}`'s `beforeLoad` re-resolves
  // it afterwards but only for client-side navigations — waiting for that async call would mean
  // the client's first render starts from the instance's default locale instead of the tenant's
  // actual one, causing a hydration mismatch whenever they differ.
  const initialLocale = typeof document === "undefined" ? undefined : document.documentElement.lang;
  const i18n = createI18nInstance(initialLocale);

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
