import * as Sentry from "@sentry/cloudflare";

import type { ServiceWorkerBinding } from "../../config/env/schema";

const SEND_PATH = "https://email-worker.internal/send?productId=qmenut";
const FROM_PROFILE = "qmenut-default";
const TEMPLATE = "user-invite";
const REQUEST_TIMEOUT_MS = 15_000;

export type UserInviteSendErrorCode = "EMAIL_REJECTED" | "EMAIL_WORKER_UNREACHABLE" | "UNEXPECTED_ERROR";

export interface UserInviteSendResult {
  errorCode: UserInviteSendErrorCode | null;
}

interface SendUserInviteEmailInput {
  emailWorker: ServiceWorkerBinding;
  panelUrl: string;
  recipientEmail: string;
  restaurantName: string;
  userName: string;
}

function stableErrorCode(status: number): UserInviteSendErrorCode {
  if (status === 429 || status >= 500) {
    return "EMAIL_WORKER_UNREACHABLE";
  }

  return "EMAIL_REJECTED";
}

async function drainResponseBody(response: Response): Promise<void> {
  try {
    await response.arrayBuffer();
  } catch {
    // El código HTTP estable es suficiente para el estado mostrado en el panel.
  }
}

export async function sendUserInviteEmail({
  emailWorker,
  panelUrl,
  recipientEmail,
  restaurantName,
  userName,
}: SendUserInviteEmailInput): Promise<UserInviteSendResult> {
  try {
    const response = await emailWorker.fetch(SEND_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        template: TEMPLATE,
        fromProfile: FROM_PROFILE,
        to: recipientEmail,
        data: { userName, restaurantName, panelUrl },
        metadata: { requestId: crypto.randomUUID(), source: "user-invite" },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      await drainResponseBody(response);
      const errorCode = stableErrorCode(response.status);
      console.error("El worker de correo rechazó una invitación de usuario", { errorCode });
      return { errorCode };
    }

    return { errorCode: null };
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      console.error("El worker de correo agotó el tiempo al enviar una invitación de usuario", {
        errorCode: "EMAIL_WORKER_UNREACHABLE",
      });
      return { errorCode: "EMAIL_WORKER_UNREACHABLE" };
    }

    Sentry.captureException(error, { tags: { module: "user-invite" } });
    console.error("Falló el envío de una invitación de usuario", { errorCode: "UNEXPECTED_ERROR" });
    return { errorCode: "UNEXPECTED_ERROR" };
  }
}
