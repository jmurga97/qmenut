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
    // A renewal also moves D1's expiry, so a dropped Set-Cookie would leave the browser cookie on its old date.
    getSession: async () => {
      const { headers, response } = await auth.api.getSession({ headers: request.headers, returnHeaders: true });
      headers.forEach((value, name) => {
        if (name === "set-cookie") resHeaders.append(name, value);
      });
      return response;
    },
    request,
  };
}
