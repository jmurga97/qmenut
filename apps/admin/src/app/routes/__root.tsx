import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

import type { AdminRouterContext } from "~/lib/trpc";

function RootRouteComponent() {
  return <Outlet />;
}
export const Route = createRootRouteWithContext<AdminRouterContext>()({
  component: RootRouteComponent,
});
