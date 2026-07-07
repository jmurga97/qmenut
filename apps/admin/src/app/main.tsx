import { registerMurgaComponents } from "@murga.ing/components/register";
import "@murga.ing/components/react";
import * as Sentry from "@sentry/react";
import { createBrowserHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppProviders } from "@app/providers";
import { routeTree } from "@app/route-tree.gen";
import { RouteErrorState } from "@components/error/error-state";
import { LoadingState } from "@components/loading/loading-state";
import { queryClient } from "@lib/query-client";
import { initializeTheme } from "@lib/theme";
import { trpc } from "@lib/trpc";
import "./styles/global.css";

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
}

registerMurgaComponents();
initializeTheme();

const router = createRouter({
  routeTree,
  history: createBrowserHistory(),
  context: {
    queryClient,
    trpc,
  },
  defaultErrorComponent: RouteErrorState,
  defaultPendingComponent: () => <LoadingState />,
  defaultPendingMinMs: 200,
  defaultPendingMs: 120,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const container = document.getElementById("root");

if (!container) {
  throw new Error("Unable to find root element");
}

createRoot(container).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
