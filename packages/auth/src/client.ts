import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export { createAuthClient };
export const emailOtpClient = emailOTPClient;

export interface CreateEmailOtpAuthClientOptions {
  baseURL: string;
}

export function createEmailOtpAuthClient({ baseURL }: CreateEmailOtpAuthClientOptions) {
  return createAuthClient({
    baseURL,
    fetchOptions: {
      credentials: "include",
    },
    plugins: [emailOTPClient()],
  });
}
