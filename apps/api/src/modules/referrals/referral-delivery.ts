import { TRPCError } from "@trpc/server";

import type { CampaignResult, EmailCampaignsBinding, RuntimeEnv } from "../../config/env/schema";

const SEND_PATH = "https://email-worker.internal/send?productId=qmenut";
const REQUEST_TIMEOUT_MS = 15_000;

interface AccessLinkInput {
  env: RuntimeEnv;
  to: string;
  purpose: "verify" | "access";
  url: string;
}

/** Transactional link email through the existing Cloudflare transport. Throws so the visitor can retry. */
export async function sendAccessLink({ env, to, purpose, url }: AccessLinkInput): Promise<void> {
  if (env.REFERRAL_DELIVERY === "simulate") {
    console.log("[referrals] simulated email", { purpose, url });
    return;
  }

  const response = await env.EMAIL_WORKER.fetch(SEND_PATH, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      template: "referral-access",
      fromProfile: "qmenut-default",
      to,
      data: { purpose, url },
      metadata: { requestId: crypto.randomUUID(), source: "referrals" },
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  await response.arrayBuffer();

  if (!response.ok) {
    console.error("El worker de correo rechazó un enlace de referidos", { status: response.status });
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No pudimos enviar el correo. Inténtalo de nuevo." });
  }
}

export function requireCampaigns(env: RuntimeEnv): EmailCampaignsBinding {
  if (!env.EMAIL_CAMPAIGNS) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Falta el binding EMAIL_CAMPAIGNS del worker de correo.",
    });
  }

  return env.EMAIL_CAMPAIGNS;
}

/** Unwraps a CampaignRpc envelope; the provider message is safe to show to staff. */
export function unwrap<T>(result: CampaignResult<T>): T {
  if (result.success) return result.data;

  throw new TRPCError({ code: "BAD_GATEWAY", message: `Instantly: ${result.error.message}` });
}

export function offerUrl(env: RuntimeEnv, recipientId: string): string {
  return `${env.REFERRALS_APP_URL}/i/${recipientId}`;
}
