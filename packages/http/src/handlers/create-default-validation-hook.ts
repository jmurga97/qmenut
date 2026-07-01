import { BAD_REQUEST } from "../status-codes";
import { formatValidationMessage } from "../validation";

import type { EnvWithLogger } from "./types";
import type { OpenAPIHonoOptions } from "@hono/zod-openapi";

export function createDefaultValidationHook<E extends EnvWithLogger>(): OpenAPIHonoOptions<E>["defaultHook"] {
  return (result, c) => {
    if (result.success) {
      return undefined;
    }

    return c.json(
      {
        success: false as const,
        error: formatValidationMessage(result.error),
      },
      BAD_REQUEST,
    );
  };
}
