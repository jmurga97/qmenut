/// <reference types="@cloudflare/workers-types" />

import { z } from "zod";

export interface ServiceWorkerBinding {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

/** One push of one notification to one device, so a retry never re-sends to devices that already got it. */
export interface PushMessage {
  notificationId: string;
  deviceId: string;
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

export const MSG_PRODUCT_IDS = ["qmenut", "qmenut-dev"] as const;

export type MsgProductId = (typeof MSG_PRODUCT_IDS)[number];

export interface MsgWorkerBinding {
  send(input: {
    productId: MsgProductId;
    idempotencyKey: string;
    templateId: string;
    to: string;
    ref: string;
    data: Record<string, string>;
  }): Promise<unknown>;
  reply(input: { productId: MsgProductId; conversationId: string; text: string }): Promise<unknown>;
}

export const CAMPAIGN_PRODUCT_IDS = ["qmenut", "qmenut-dev"] as const;

export type CampaignResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; retryable: boolean } };

export interface CampaignLead {
  email: string;
  name: string | null;
  recipientId: string;
  offerUrl: string;
}

interface CampaignOffer {
  productId: (typeof CAMPAIGN_PRODUCT_IDS)[number];
  rewardCents: number;
  templateVersion: number;
}

/** ming-email-worker `CampaignRpc`: Instantly campaigns rendered from controlled templates. */
export interface EmailCampaignsBinding {
  preview(input: CampaignOffer): Promise<CampaignResult<{ subject: string; html: string }>>;
  sendTest(input: CampaignOffer & { to: string; offerUrl: string }): Promise<CampaignResult<null>>;
  createCampaign(input: CampaignOffer & { name: string }): Promise<CampaignResult<{ campaignId: string }>>;
  addLeads(input: {
    productId: CampaignOffer["productId"];
    campaignId: string;
    leads: CampaignLead[];
  }): Promise<CampaignResult<{ createdIndexes: number[] }>>;
  setCampaignState(input: {
    productId: CampaignOffer["productId"];
    campaignId: string;
    state: "active" | "paused";
  }): Promise<CampaignResult<null>>;
  suppress(input: { productId: CampaignOffer["productId"]; emails: string[] }): Promise<CampaignResult<null>>;
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

const msgWorkerBindingSchema = z.custom<MsgWorkerBinding>(
  (value) =>
    typeof value === "object" &&
    value !== null &&
    typeof (value as { send?: unknown }).send === "function" &&
    typeof (value as { reply?: unknown }).reply === "function",
  "El binding de servicio MSG_WORKER debe implementar send y reply",
);

const exchangeRateWorkerBindingSchema = z.custom<ExchangeRateWorkerBinding>(
  (value) =>
    typeof value === "object" &&
    value !== null &&
    typeof (value as { getLatestRates?: unknown }).getLatestRates === "function",
  "El binding de servicio EXCHANGE_RATE_WORKER debe implementar getLatestRates",
);

const emailCampaignsBindingSchema = z.custom<EmailCampaignsBinding>(
  (value) =>
    typeof value === "object" &&
    value !== null &&
    typeof (value as { createCampaign?: unknown }).createCampaign === "function",
  "El binding de servicio EMAIL_CAMPAIGNS debe implementar createCampaign",
);

const emailListSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) =>
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
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
  // Absent locally on purpose: simulated delivery never calls it, and previews say it is missing.
  EMAIL_CAMPAIGNS: emailCampaignsBindingSchema.optional(),
  CAMPAIGN_PRODUCT_ID: z.enum(CAMPAIGN_PRODUCT_IDS).default("qmenut-dev"),
  // "simulate" marks campaign recipients as sent and logs referral links instead of emailing them.
  REFERRAL_DELIVERY: z.enum(["simulate", "live"]).default("simulate"),
  REFERRALS_APP_URL: z.url(),
  REFERRAL_LIMITER: z.custom<RateLimit>(
    (value) =>
      typeof value === "object" && value !== null && typeof (value as { limit?: unknown }).limit === "function",
    "El binding REFERRAL_LIMITER debe implementar limit",
  ),
  // Lab: Cloudflare Access application plus the explicit staff allowlist. Both are required to enter.
  ACCESS_TEAM_DOMAIN: optionalSecret,
  ACCESS_LAB_AUD: optionalSecret,
  LAB_STAFF_EMAILS: emailListSchema,
  // Local wrangler dev only (passed with --var); ignored when NODE_ENV is production.
  LAB_DEV_STAFF_EMAIL: optionalSecret,
  IMAGE_WORKER: imageWorkerBindingSchema,
  EXCHANGE_RATE_WORKER: exchangeRateWorkerBindingSchema.optional(),
  // Absent in local wrangler dev on purpose: messaging features log and skip without it.
  MSG_WORKER: msgWorkerBindingSchema.optional(),
  MSG_PRODUCT_ID: z.enum(MSG_PRODUCT_IDS).default("qmenut-dev"),
  TENANT_THEME: z.custom<KVNamespace>(
    (value) => typeof value === "object" && value !== null && typeof (value as { put?: unknown }).put === "function",
    "El binding TENANT_THEME debe implementar put",
  ),
  LOYALTY_TOKEN_SECRET: z.string().min(1),
  LOYALTY_CODE_LIMITER: z.custom<RateLimit>(
    (value) =>
      typeof value === "object" && value !== null && typeof (value as { limit?: unknown }).limit === "function",
    "El binding LOYALTY_CODE_LIMITER debe implementar limit",
  ),
  RESERVATION_LIMITER: z.custom<RateLimit>(
    (value) =>
      typeof value === "object" && value !== null && typeof (value as { limit?: unknown }).limit === "function",
    "El binding RESERVATION_LIMITER debe implementar limit",
  ),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_BASIC: z.string().min(1),
  STRIPE_PRICE_BUSINESS: z.string().min(1),
  ADMIN_APP_URL: z.url(),
  SENTRY_DSN: z.string().trim().optional(),
  GOOGLE_PLACES_API_KEY: optionalSecret,
  NODE_ENV: nodeEnvSchema.default("development"),
  NOTIFICATIONS_QUEUE: z.custom<Queue<PushMessage>>(
    (value) => typeof value === "object" && value !== null && typeof (value as { send?: unknown }).send === "function",
    "El binding NOTIFICATIONS_QUEUE debe implementar send",
  ),
  POSTHOG_API_HOST: z.url().default("https://eu.posthog.com"),
  POSTHOG_PERSONAL_API_KEY: optionalSecret,
  POSTHOG_PROJECT_ID: optionalSecret,
  // Push stays off until all three are set; the inbox works without them.
  VAPID_PUBLIC_KEY: optionalSecret,
  VAPID_PRIVATE_KEY: optionalSecret,
  VAPID_SUBJECT: optionalSecret,
});

export type EnvBindings = z.input<typeof envSchema>;
export type RuntimeEnv = z.output<typeof envSchema>;
