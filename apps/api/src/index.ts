import { createDb } from "@qmenut/db";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { createAuth } from "@/auth/create-auth";
import { parseEnv } from "@/config/env";
import { applyCorsHeaders, createOptionsResponse } from "@/http/cors";
import { jsonResponse } from "@/http/json";
import { handleStripeWebhook } from "@/modules/billing/handle-stripe-webhook";
import { createContext } from "@/trpc/context";
import { appRouter } from "@/trpc/router";

import type { EnvBindings } from "@/config/env/schema";

const TRPC_ENDPOINT = "/trpc";
const AUTH_PREFIX = "/api/auth";
const STRIPE_WEBHOOK_PATH = "/webhooks/stripe";

async function handleRequest(request: Request, rawEnv: EnvBindings): Promise<Response> {
  const env = parseEnv(rawEnv);

  if (request.method === "OPTIONS") {
    return createOptionsResponse(request, env);
  }

  const url = new URL(request.url);

  if (url.pathname === "/health") {
    return jsonResponse({ status: "ok" });
  }

  if (url.pathname === STRIPE_WEBHOOK_PATH && request.method === "POST") {
    return handleStripeWebhook({ request, env, db: createDb(env.DB) });
  }

  if (url.pathname.startsWith(AUTH_PREFIX)) {
    const auth = createAuth({ db: createDb(env.DB), env });

    return auth.handler(request);
  }

  if (url.pathname.startsWith(TRPC_ENDPOINT)) {
    return fetchRequestHandler({
      endpoint: TRPC_ENDPOINT,
      req: request,
      router: appRouter,
      createContext: () => createContext({ env, request }),
    });
  }

  return jsonResponse({ error: "Not found" }, { status: 404 });
}

export default {
  async fetch(request: Request, rawEnv: EnvBindings): Promise<Response> {
    const env = parseEnv(rawEnv);
    const response = await handleRequest(request, rawEnv);

    return applyCorsHeaders({ env, request, response });
  },
};
