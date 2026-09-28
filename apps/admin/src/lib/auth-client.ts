import { createEmailOtpAuthClient } from "@qmenut/auth/client";

import { i18n } from "~/lib/i18n";

import { getApiBaseUrl } from "./trpc";

export const authClient = createEmailOtpAuthClient({
  baseURL: `${getApiBaseUrl()}/api/auth`,
});
interface AuthClientResult {
  error?: {
    message?: string;
    statusText?: string;
  } | null;
}
export function assertAuthClientResult(result: AuthClientResult) {
  if (!result.error) {
    return;
  }
  throw new Error(result.error.message ?? result.error.statusText ?? i18n.t("common___Autenticación rechazada."));
}
export async function signOut(): Promise<void> {
  const result = await authClient.signOut();
  assertAuthClientResult(result);
}
