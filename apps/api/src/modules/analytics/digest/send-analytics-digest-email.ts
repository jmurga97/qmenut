import * as Sentry from "@sentry/cloudflare";

import type { AnalyticsDigestEmailData } from "./build-digest-email-data";
import type { ServiceWorkerBinding } from "@/config/env/schema";

/**
 * Envío del digest a través del binding privado con ming-email-worker
 * (POST /send?productId=qmenut). Se registran únicamente estado, timestamps y códigos
 * estables de error; nunca destinatarios, cuerpos ni IDs del proveedor.
 */

const SEND_PATH = "https://email-worker.internal/send?productId=qmenut";
const FROM_PROFILE = "qmenut-default";
const TEMPLATE = "analytics-digest";
const REQUEST_TIMEOUT_MS = 15_000;

export type DigestSendErrorCode = "EMAIL_REJECTED" | "EMAIL_WORKER_UNREACHABLE" | "UNEXPECTED_ERROR";

export interface DigestSendResult {
  errorCode: DigestSendErrorCode | null;
}

interface SendAnalyticsDigestInput {
  data: AnalyticsDigestEmailData;
  emailWorker: ServiceWorkerBinding;
  recipientEmail: string;
  requestId: string;
}

function stableErrorCode(status: number): DigestSendErrorCode {
  if (status === 429 || status >= 500) {
    return "EMAIL_WORKER_UNREACHABLE";
  }

  return "EMAIL_REJECTED";
}

/** Consume el cuerpo de error sin registrar contenido del proveedor. */
async function drainResponseBody(response: Response): Promise<void> {
  try {
    await response.arrayBuffer();
  } catch {
    // Cuerpo no legible: basta el código estable por estado HTTP.
  }
}

export async function sendAnalyticsDigestEmail({
  data,
  emailWorker,
  recipientEmail,
  requestId,
}: SendAnalyticsDigestInput): Promise<DigestSendResult> {
  try {
    const response = await emailWorker.fetch(SEND_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        template: TEMPLATE,
        fromProfile: FROM_PROFILE,
        to: recipientEmail,
        data,
        metadata: { requestId, source: "analytics-digest" },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      await drainResponseBody(response);

      return { errorCode: stableErrorCode(response.status) };
    }

    // El messageId del proveedor se descarta deliberadamente.
    return { errorCode: null };
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return { errorCode: "EMAIL_WORKER_UNREACHABLE" };
    }

    Sentry.captureException(error, { tags: { module: "analytics-digest" } });

    return { errorCode: "UNEXPECTED_ERROR" };
  }
}
