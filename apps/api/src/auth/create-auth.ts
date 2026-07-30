import { createAuth as createEmailOtpAuth, createEmailWorkerOtpSender } from "@qmenut/auth";
import { OTP_EXPIRES_IN_LABEL } from "@qmenut/auth/store";
import * as schema from "@qmenut/db/schema";

import type { RuntimeEnv } from "../config/env/schema";
import type { Auth } from "@qmenut/auth";
import type { DrizzleDb } from "@qmenut/db/client";

interface CreateAuthInput {
  db: DrizzleDb;
  env: RuntimeEnv;
}

export function createAuth({ db, env }: CreateAuthInput) {
  const fixedOtpAccounts =
    env.E2E_FIXED_OTP === "true" && env.NODE_ENV !== "production"
      ? [
          { email: "e2e@test.local", otp: "000000" },
          { email: "staff.e2e@test.local", otp: "000000" },
        ]
      : undefined;

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
  });
}

export type { Auth };
