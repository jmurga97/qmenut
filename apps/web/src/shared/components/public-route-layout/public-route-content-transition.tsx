import { Outlet, useRouterState } from "@tanstack/react-router";

const PUBLIC_TRANSITION_ROUTE_IDS = new Set([
  "/{-$locale}/",
  "/{-$locale}/contacto",
  "/{-$locale}/destacados",
  "/{-$locale}/puntos",
]);

export function PublicRouteContentTransition() {
  const routeId = useRouterState({
    select: (state) => state.matches.at(-1)?.routeId,
  });

  const isTransitionableRoute = routeId !== undefined && PUBLIC_TRANSITION_ROUTE_IDS.has(routeId);
  const surfaceClassName = [
    "public-route-transition-surface",
    isTransitionableRoute ? "public-route-transition-surface--animated" : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  // Keep the surface stable through SSR hydration; non-target routes opt out of animation.
  return (
    <div className={surfaceClassName}>
      <Outlet />
    </div>
  );
}
