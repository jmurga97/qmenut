import { createAuth as createEmailOtpAuth, createEmailWorkerOtpSender, OTP_EXPIRES_IN_LABEL } from "@qmenut/auth";
import * as schema from "@qmenut/db/schema";

import type { RuntimeEnv } from "../config/env/schema";
import type { Auth } from "@qmenut/auth";
import type { DrizzleDb } from "@qmenut/db";

interface CreateAuthInput {
  db: DrizzleDb;
  env: RuntimeEnv;
}

export function createAuth({ db, env }: CreateAuthInput) {
  return createEmailOtpAuth({
    db,
    schema,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: env.ALLOWED_ORIGINS?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    emailOtpSender: createEmailWorkerOtpSender({
      worker: env.EMAIL_WORKER,
      expiresInLabel: OTP_EXPIRES_IN_LABEL,
    }),
  });
}

export type { Auth };
