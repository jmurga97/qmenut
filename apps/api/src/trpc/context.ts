import { createDb } from "@qmenut/db/client";

import { createAuth } from "../auth/create-auth";

import type { Auth } from "../auth/create-auth";
import type { RuntimeEnv } from "../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";

export interface TrpcContext {
  auth: Auth;
  db: DrizzleDb;
  env: RuntimeEnv;
  getSession: () => ReturnType<Auth["api"]["getSession"]>;
  request: Request;
  /** Response headers, for the referral session cookie. */
  resHeaders: Headers;
}

interface CreateContextInput {
  env: RuntimeEnv;
  request: Request;
  resHeaders: Headers;
}

export function createContext({ env, request, resHeaders }: CreateContextInput): TrpcContext {
  const db = createDb(env.DB);
  const auth = createAuth({ db, env });

  return {
    auth,
    db,
    env,
    getSession: () => auth.api.getSession({ headers: request.headers }),
    request,
    resHeaders,
  };
}
