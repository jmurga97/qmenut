import { createAuth } from "@/auth/create-auth";
import { createDb } from "@/db";

import type { Auth } from "@/auth/create-auth";
import type { RuntimeEnv } from "@/config/env/schema";
import type { DrizzleDb } from "@/db";

export interface TrpcContext {
  auth: Auth;
  db: DrizzleDb;
  env: RuntimeEnv;
  getSession: () => ReturnType<Auth["api"]["getSession"]>;
  request: Request;
}

interface CreateContextInput {
  env: RuntimeEnv;
  request: Request;
}

export function createContext({ env, request }: CreateContextInput): TrpcContext {
  const db = createDb(env.DB);
  const auth = createAuth({ db, env });

  return {
    auth,
    db,
    env,
    getSession: () => auth.api.getSession({ headers: request.headers }),
    request,
  };
}
