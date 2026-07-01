import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import * as schema from "@/db/schema";

import type { RuntimeEnv } from "@/config/env/schema";
import type { DrizzleDb } from "@/db";

interface CreateAuthInput {
  db: DrizzleDb;
  env: RuntimeEnv;
}

export function createAuth({ db, env }: CreateAuthInput) {
  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
      usePlural: true,
    }),
    emailAndPassword: {
      enabled: true,
    },
    trustedOrigins: env.ALLOWED_ORIGINS?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  });
}

export type Auth = ReturnType<typeof createAuth>;
