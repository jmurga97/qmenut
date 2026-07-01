import { z } from "zod";

export const logLevelSchema = z.enum(["trace", "debug", "info", "warn", "error", "fatal"]);
export const nodeEnvSchema = z.enum(["development", "test", "production"]);

export const baseEnvSchema = z.object({
  LOG_LEVEL: logLevelSchema.default("info"),
  NODE_ENV: nodeEnvSchema.default("development"),
});

export type BaseEnvBindings = z.input<typeof baseEnvSchema>;
export type BaseEnv = z.output<typeof baseEnvSchema>;
