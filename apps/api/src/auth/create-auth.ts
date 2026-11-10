import { createAuth as createEmailOtpAuth, createEmailWorkerOtpSender, FIXED_OTP_WILDCARD } from "@qmenut/auth";
import { OTP_EXPIRES_IN_LABEL } from "@qmenut/auth/store";
import * as schema from "@qmenut/db/schema";

import type { RuntimeEnv } from "../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";

interface CreateAuthInput {
  db: DrizzleDb;
  env: RuntimeEnv;
  allowSignUp?: boolean;
}

const DEVELOPMENT_OTP = "000000";

const usesDevelopmentOtp = (env: RuntimeEnv): boolean =>
  env.DEV_FIXED_OTP === "true" && (env.NODE_ENV === "development" || env.NODE_ENV === "test");

export function createAuth({ db, env, allowSignUp }: CreateAuthInput) {
  const fixedOtpAccounts = usesDevelopmentOtp(env) ? [{ email: FIXED_OTP_WILDCARD, otp: DEVELOPMENT_OTP }] : undefined;

  return createEmailOtpAuth({
    db,
    schema,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: env.ALLOWED_ORIGINS,
    emailOtpSender: createEmailWorkerOtpSender({
      worker: env.EMAIL_WORKER,
      expiresInLabel: OTP_EXPIRES_IN_LABEL,
    }),
    fixedOtpAccounts,
    allowSignUp,
  });
}

/** Sign-up code for an email with no user yet; Better Auth's own send endpoint refuses those. */
export async function sendSignupCode({ db, env, email }: CreateAuthInput & { email: string }): Promise<void> {
  const otp = await createAuth({ db, env }).api.createVerificationOTP({ body: { email, type: "sign-in" } });
  if (usesDevelopmentOtp(env)) return;
  await createEmailWorkerOtpSender({ worker: env.EMAIL_WORKER, expiresInLabel: OTP_EXPIRES_IN_LABEL })({
    email,
    otp,
    type: "sign-in",
  });
}

export type { Auth } from "@qmenut/auth";
