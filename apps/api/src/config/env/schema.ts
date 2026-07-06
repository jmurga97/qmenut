/// <reference types="@cloudflare/workers-types" />

import { z } from "zod";

export interface EmailWorkerServiceBinding {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface ThemeWorkerServiceBinding {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

const logLevelSchema = z.enum(["trace", "debug", "info", "warn", "error", "fatal"]);
const nodeEnvSchema = z.enum(["development", "test", "production"]);

export const envSchema = z.object({
  ALLOWED_ORIGINS: z.string().trim().optional(),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url(),
  DEEPL_API_KEY: z.string().trim().min(1).optional(),
  DEEPL_API_URL: z.string().url().default("https://api-free.deepl.com"),
  DB: z.custom<D1Database>((value) => typeof value === "object" && value !== null, {
    error: "DB binding is required",
  }),
  EMAIL_WORKER: z.custom<EmailWorkerServiceBinding>(
    (value) =>
      typeof value === "object" && value !== null && typeof (value as { fetch?: unknown }).fetch === "function",
    "EMAIL_WORKER service binding must implement fetch",
  ),
  THEME_WORKER: z.custom<ThemeWorkerServiceBinding>(
    (value) =>
      typeof value === "object" && value !== null && typeof (value as { fetch?: unknown }).fetch === "function",
    "THEME_WORKER service binding must implement fetch",
  ),
  THEME_WORKER_TOKEN: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_BASIC: z.string().min(1),
  STRIPE_PRICE_BUSINESS: z.string().min(1),
  ADMIN_APP_URL: z.string().url(),
  LOG_LEVEL: logLevelSchema.default("info"),
  NODE_ENV: nodeEnvSchema.default("development"),
});

export type EnvBindings = z.input<typeof envSchema>;
export type RuntimeEnv = z.output<typeof envSchema>;
