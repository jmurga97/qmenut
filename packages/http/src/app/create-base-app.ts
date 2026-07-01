import { OpenAPIHono } from "@hono/zod-openapi";

import { createPinoLogger } from "./pino-logger";
import { createDefaultValidationHook } from "../handlers/create-default-validation-hook";
import { createNotFoundHandler } from "../handlers/create-not-found-handler";
import { createOnErrorHandler } from "../handlers/create-on-error-handler";

import type { AppBindings } from "./types";
import type { EnvWithLogger } from "../handlers/types";
import type { Context, MiddlewareHandler } from "hono";

export function createOpenApiRouter<E extends EnvWithLogger>() {
  return new OpenAPIHono<E>({
    strict: false,
    defaultHook: createDefaultValidationHook<E>(),
  });
}

function isProductionContext<E extends EnvWithLogger>(c: Context<E>): boolean {
  const runtimeEnv = (c.var as { runtimeEnv?: { NODE_ENV?: string } }).runtimeEnv;
  return runtimeEnv?.NODE_ENV === "production";
}

interface CreateBaseAppOptions<
  EnvBindings extends object & { NODE_ENV?: string },
  RuntimeEnv extends object & { NODE_ENV?: string },
> {
  parseEnv: (rawEnv: EnvBindings) => RuntimeEnv;
  registerRoutes: (app: OpenAPIHono<AppBindings<EnvBindings, RuntimeEnv>>) => void;
  middlewares?: MiddlewareHandler<AppBindings<EnvBindings, RuntimeEnv>>[];
}

export function createBaseApp<
  EnvBindings extends object & { NODE_ENV?: string },
  RuntimeEnv extends object & { NODE_ENV?: string },
>(options: CreateBaseAppOptions<EnvBindings, RuntimeEnv>): OpenAPIHono<AppBindings<EnvBindings, RuntimeEnv>> {
  const app = createOpenApiRouter<AppBindings<EnvBindings, RuntimeEnv>>();

  app.use("*", createPinoLogger());
  app.use("*", async (c, next) => {
    c.set("runtimeEnv", options.parseEnv(c.env));
    await next();
  });

  for (const middleware of options.middlewares ?? []) {
    app.use("*", middleware);
  }

  options.registerRoutes(app);

  app.notFound(createNotFoundHandler());
  app.onError(createOnErrorHandler(isProductionContext));

  return app;
}
