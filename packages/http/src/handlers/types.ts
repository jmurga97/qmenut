import type { Context, Env } from "hono";

export interface LoggerVariable {
  error?: (value: unknown, message?: string) => void;
}

export type EnvWithLogger = Env & {
  Variables: {
    logger?: LoggerVariable;
  };
};

export type IsProductionContext<E extends EnvWithLogger> = (c: Context<E>) => boolean;
