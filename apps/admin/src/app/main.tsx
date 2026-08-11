import { registerMurgaComponents } from "@murga.ing/components/register";
import "@murga.ing/components/react";
import * as Sentry from "@sentry/react";
import { createBrowserHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppProviders } from "~/app/providers";
import { routeTree } from "~/app/route-tree.gen";
import { queryClient } from "~/lib/query-client";
import { trpc } from "~/lib/trpc";
import { RouteErrorState } from "~/shared/components/state/error-state";
import { LoadingState } from "~/shared/components/state/loading-state";
import { NotFoundState } from "~/shared/components/state/not-found-state";
import "./styles/global.css";
import "../shared/components/forms/styles.css";
import "../features/auth/styles.css";
import "../features/branch/styles.css";
import "../features/languages/styles.css";
import "../features/loyalty/styles.css";
import "../features/overview/styles.css";
import "../features/qr/styles.css";
import "../features/theme/styles.css";

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
}
registerMurgaComponents();
const router = createRouter({
  routeTree,
  history: createBrowserHistory(),
  context: {
    queryClient,
    trpc,
  },
  defaultErrorComponent: RouteErrorState,
  defaultNotFoundComponent: NotFoundState,
  defaultPendingComponent: () => <LoadingState />,
  defaultPendingMinMs: 200,
  defaultPendingMs: 120,
});
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
const container = document.querySelector("#root");
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
