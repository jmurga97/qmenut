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
  retryUpload(input: GetImageWorkerUploadInput): Promise<unknown>;
  backfillVariants(input: {
    productId: "qmenut";
    presetId: "qmenut-menu-image" | "qmenut-branch-photo" | "qmenut-logo";
    cursor: string | null;
    limit: number;
  }): Promise<unknown>;
  createUpload(input: CreateImageWorkerUploadInput): Promise<unknown>;
  getUpload(input: GetImageWorkerUploadInput): Promise<unknown>;
}

export interface ExchangeRateWorkerBinding {
  getLatestRates(input: { currencies?: Array<"USD" | "EUR"> }): Promise<unknown>;
}

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
    typeof (value as { getLatestRates?: unknown }).getLatestRates === "function",
  "El binding de servicio EXCHANGE_RATE_WORKER debe implementar getLatestRates",
);

// An empty value disables an optional provider, so `--var KEY:` can switch one off over .dev.vars.
const optionalSecret = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);

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
  DEEPL_API_KEY: optionalSecret,
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
  EXCHANGE_RATE_WORKER: exchangeRateWorkerBindingSchema.optional(),
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
  GOOGLE_PLACES_API_KEY: optionalSecret,
  NODE_ENV: nodeEnvSchema.default("development"),
  POSTHOG_API_HOST: z.url().default("https://eu.posthog.com"),
  POSTHOG_PERSONAL_API_KEY: optionalSecret,
  POSTHOG_PROJECT_ID: optionalSecret,
});

export type EnvBindings = z.input<typeof envSchema>;
export type RuntimeEnv = z.output<typeof envSchema>;
