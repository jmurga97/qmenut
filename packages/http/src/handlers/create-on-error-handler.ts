import { toHttpError } from "../errors/map-error";
import { INTERNAL_SERVER_ERROR } from "../status-codes";

import type { EnvWithLogger, IsProductionContext, LoggerVariable } from "./types";
import type { ErrorHandler } from "hono";

function isLoggerVariable(value: unknown): value is LoggerVariable {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const logger = value as { error?: unknown };

  return logger.error === undefined || typeof logger.error === "function";
}

export function createOnErrorHandler<E extends EnvWithLogger>(
  isProductionContext: IsProductionContext<E>,
): ErrorHandler<E> {
  return (error, c) => {
    const httpError = toHttpError(error);
    const logger: unknown = c.var.logger;

    if (httpError.status === INTERNAL_SERVER_ERROR && isLoggerVariable(logger)) {
      logger?.error?.({ err: error }, "Unhandled error");
    }

    return c.json(
      {
        success: false as const,
        error: httpError.message,
        ...(!isProductionContext(c) && error instanceof Error ? { stack: error.stack } : {}),
      },
      httpError.status,
    );
  };
}
