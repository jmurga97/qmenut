/// <reference types="@cloudflare/workers-types" />

import { z } from "zod";

export interface EmailWorkerServiceBinding {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

const logLevelSchema = z.enum(["trace", "debug", "info", "warn", "error", "fatal"]);
const nodeEnvSchema = z.enum(["development", "test", "production"]);

export const envSchema = z.object({
  ALLOWED_ORIGINS: z.string().trim().optional(),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url(),
  DB: z.custom<D1Database>((value) => typeof value === "object" && value !== null, {
    error: "DB binding is required",
  }),
  EMAIL_WORKER: z.custom<EmailWorkerServiceBinding>(
    (value) =>
      typeof value === "object" && value !== null && typeof (value as { fetch?: unknown }).fetch === "function",
    "EMAIL_WORKER service binding must implement fetch",
  ),
  LOG_LEVEL: logLevelSchema.default("info"),
  NODE_ENV: nodeEnvSchema.default("development"),
});

export type EnvBindings = z.input<typeof envSchema>;
export type RuntimeEnv = z.output<typeof envSchema>;
