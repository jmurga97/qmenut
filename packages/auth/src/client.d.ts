import type { emailOTPClient } from "better-auth/client/plugins";
import type { createAuthClient as createBetterAuthClient } from "better-auth/react";

export declare const createAuthClient: typeof createBetterAuthClient;
export declare const emailOtpClient: typeof emailOTPClient;

export interface CreateEmailOtpAuthClientOptions {
  baseURL: string;
}

export declare function createEmailOtpAuthClient(options: CreateEmailOtpAuthClientOptions): ReturnType<
  typeof createBetterAuthClient<{
    plugins: [ReturnType<typeof emailOTPClient>];
  }>
>;
