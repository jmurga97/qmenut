import { createRoute } from "@hono/zod-openapi";

import { validationErrorResponses } from "../responses";

import type { RouteConfig } from "@hono/zod-openapi";

type RouteResponses = RouteConfig["responses"];

type ApiRouteOptions = RouteConfig & {
  errorResponses?: RouteResponses;
};

export function createApiRoute<const Route extends ApiRouteOptions>(route: Route) {
  const { responses, errorResponses = validationErrorResponses, ...routeConfig } = route;

  return createRoute({
    ...routeConfig,
    responses: {
      ...responses,
      ...errorResponses,
    },
  });
}
