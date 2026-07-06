import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

import { RouteErrorState } from "@components/error/error-state";
import { LoadingState } from "@components/loading/loading-state";
import { NotFoundState } from "@components/not-found-state";

import type { AdminRouterContext } from "@lib/trpc";

function RootRouteComponent() {
  return <Outlet />;
}

export const Route = createRootRouteWithContext<AdminRouterContext>()({
  component: RootRouteComponent,
  errorComponent: RouteErrorState,
  notFoundComponent: NotFoundState,
  pendingComponent: () => <LoadingState label="Cargando el panel..." />,
});
