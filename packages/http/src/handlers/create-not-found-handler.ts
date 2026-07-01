import { NOT_FOUND } from "../status-codes";

import type { EnvWithLogger } from "./types";
import type { NotFoundHandler } from "hono";

export function createNotFoundHandler<E extends EnvWithLogger>(): NotFoundHandler<E> {
  return (c) =>
    c.json(
      {
        success: false as const,
        error: "Not found",
      },
      NOT_FOUND,
    );
}
