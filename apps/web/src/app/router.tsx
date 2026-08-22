import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { routeTree } from "~/app/route-tree.gen";
import { createI18nInstance } from "~/lib/i18n/create-i18n";
import { LOCALE_PATTERN } from "~/lib/i18n/locale-pattern";
import { createTrpcOptionsProxy } from "~/lib/trpc-client";

const PUBLIC_VIEW_TRANSITION_PATHS = ["/", "/destacados", "/contacto", "/puntos"] as const;

function getPublicViewTransitionIndex(pathname: string) {
  const pathSegments = pathname.split("/").filter(Boolean);
  const pathWithoutLocale = LOCALE_PATTERN.test(pathSegments[0] ?? "") ? pathSegments.slice(1) : pathSegments;
  const publicPath = `/${pathWithoutLocale.join("/")}`;

  return PUBLIC_VIEW_TRANSITION_PATHS.indexOf(publicPath as (typeof PUBLIC_VIEW_TRANSITION_PATHS)[number]);
}

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
    // TanStack Router owns the route store update, so its native wrapper is needed
    // for React's public-route ViewTransition boundary to capture the page swap.
    // Keep the temporary experiment limited to the four public content routes.
    defaultViewTransition: {
      // TanStack intentionally uses false to disable a transition and string[] to enable one.
      // eslint-disable-next-line sonarjs/function-return-type
      types: ({ fromLocation, toLocation }) => {
        if (!fromLocation) return false;

        const fromIndex = getPublicViewTransitionIndex(fromLocation.pathname);
        const toIndex = getPublicViewTransitionIndex(toLocation.pathname);

        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return false;

        return [
          "qm-public-route-slide",
          fromIndex < toIndex ? "qm-public-route-slide-forward" : "qm-public-route-slide-backward",
        ];
      },
    },
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
