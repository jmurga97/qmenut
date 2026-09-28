import "./styles/fonts.css";
import "@jmurga97/components/styles.css";
import "./styles/layout.css";
import * as Sentry from "@sentry/react";
import { createBrowserHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppProviders } from "~/app/providers";
import { routeTree } from "~/app/route-tree.gen";
import { i18n } from "~/lib/i18n";
import { queryClient } from "~/lib/query-client";
import { trpc } from "~/lib/trpc";
import { RouteErrorState } from "~/shared/components/state/error-state";
import { LoadingState } from "~/shared/components/state/loading-state";
import { NotFoundState } from "~/shared/components/state/not-found-state";
import "./styles/global.css";
import "../shared/components/charts/styles.css";
import "../shared/components/controls/styles.css";
import "../shared/components/forms/styles.css";
import "../shared/components/metrics/styles.css";
import "../shared/images/styles.css";
import "../features/auth/styles.css";
import "../features/analytics/styles.css";
import "../features/branch/styles.css";
import "./dashboard/styles.css";
import "../features/languages/styles.css";
import "../features/loyalty/styles.css";
import "../features/qr/styles.css";
import "../features/menu-print/styles.css";
import "../features/theme/styles.css";
import "../features/users/styles.css";

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
}
const router = createRouter({
  routeTree,
  history: createBrowserHistory(),
  context: {
    queryClient,
    trpc,
  },
  defaultErrorComponent: RouteErrorState,
  defaultNotFoundComponent: NotFoundState,
  defaultPendingComponent: LoadingState,
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
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
  throw new Error(i18n.t("main.tsx___Unable to find root element"));
}
createRoot(container).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
