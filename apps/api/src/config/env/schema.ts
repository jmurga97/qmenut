/// <reference types="@cloudflare/workers-types" />

import { z } from "zod";

export interface ServiceWorkerBinding {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

type ImageContentType = "image/jpeg" | "image/png" | "image/webp";

interface CreateImageWorkerUploadInput {
  productId: string;
  idempotencyKey: string;
  upload: {
    presetId: string;
    externalId: string;
    filename: string;
    contentType: ImageContentType;
    sizeBytes: number;
    metadata: { source: string };
  };
}

interface GetImageWorkerUploadInput {
  productId: string;
  uploadId: string;
}

export interface ImageWorkerBinding {
  createUpload(input: CreateImageWorkerUploadInput): Promise<unknown>;
  getUpload(input: GetImageWorkerUploadInput): Promise<unknown>;
}

export interface ExchangeRateWorkerBinding {
  getLatestRates(input: { currencies?: Array<"USD" | "EUR"> }): Promise<unknown>;
  getCaptureStatus(): Promise<unknown>;
}

const logLevelSchema = z.enum(["trace", "debug", "info", "warn", "error", "fatal"]);
const nodeEnvSchema = z.enum(["development", "test", "production"]);

function serviceWorkerBindingSchema(binding: string) {
  return z.custom<ServiceWorkerBinding>(
    (value) =>
      typeof value === "object" && value !== null && typeof (value as { fetch?: unknown }).fetch === "function",
    `El binding de servicio ${binding} debe implementar fetch`,
  );
}

const imageWorkerBindingSchema = z.custom<ImageWorkerBinding>(
  (value) =>
    typeof value === "object" &&
    value !== null &&
    typeof (value as { createUpload?: unknown }).createUpload === "function" &&
    typeof (value as { getUpload?: unknown }).getUpload === "function",
  "El binding de servicio IMAGE_WORKER debe implementar createUpload y getUpload",
);

const exchangeRateWorkerBindingSchema = z.custom<ExchangeRateWorkerBinding>(
  (value) =>
    typeof value === "object" &&
    value !== null &&
    typeof (value as { getLatestRates?: unknown }).getLatestRates === "function" &&
    typeof (value as { getCaptureStatus?: unknown }).getCaptureStatus === "function",
  "El binding de servicio EXCHANGE_RATE_WORKER debe implementar getLatestRates y getCaptureStatus",
);

export const envSchema = z.object({
  ALLOWED_ORIGINS: z
    .string()
    .trim()
    .optional()
    .transform((value) =>
      value
        ?.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.url(),
  DEEPL_API_KEY: z.string().trim().min(1).optional(),
  DEEPL_API_URL: z.url().default("https://api-free.deepl.com"),
  DEV_FIXED_OTP: z.string().trim().optional(),
  GEOCODING_LIMITER: z.custom<RateLimit>(
    (value) =>
      typeof value === "object" && value !== null && typeof (value as { limit?: unknown }).limit === "function",
    "El binding GEOCODING_LIMITER debe implementar limit",
  ),
  PUBLIC_REVIEWS_LIMITER: z.custom<RateLimit>(
    (value) =>
      typeof value === "object" && value !== null && typeof (value as { limit?: unknown }).limit === "function",
    "El binding PUBLIC_REVIEWS_LIMITER debe implementar limit",
  ),
  DB: z.custom<D1Database>((value) => typeof value === "object" && value !== null, {
    error: "El binding DB es obligatorio",
  }),
  EMAIL_WORKER: serviceWorkerBindingSchema("EMAIL_WORKER"),
  IMAGE_WORKER: imageWorkerBindingSchema,
  EXCHANGE_RATE_WORKER: exchangeRateWorkerBindingSchema,
  THEME_WORKER: serviceWorkerBindingSchema("THEME_WORKER"),
  THEME_WORKER_TOKEN: z.string().min(1),
  LOYALTY_TOKEN_SECRET: z.string().min(1),
  LOYALTY_CODE_LIMITER: z.custom<RateLimit>(
    (value) =>
      typeof value === "object" && value !== null && typeof (value as { limit?: unknown }).limit === "function",
    "El binding LOYALTY_CODE_LIMITER debe implementar limit",
  ),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_BASIC: z.string().min(1),
  ADMIN_APP_URL: z.url(),
  SENTRY_DSN: z.string().trim().optional(),
  LOG_LEVEL: logLevelSchema.default("info"),
  GOOGLE_MAPS_API_KEY: z.string().trim().min(1).optional(),
  GOOGLE_PLACES_API_KEY: z.string().trim().min(1).optional(),
  NODE_ENV: nodeEnvSchema.default("development"),
  POSTHOG_API_HOST: z.url().default("https://eu.posthog.com"),
  POSTHOG_PERSONAL_API_KEY: z.string().trim().min(1).optional(),
  POSTHOG_PROJECT_ID: z.string().trim().min(1).optional(),
});

export type EnvBindings = z.input<typeof envSchema>;
export type RuntimeEnv = z.output<typeof envSchema>;
