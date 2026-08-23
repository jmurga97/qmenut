import { createDb } from "@qmenut/db/client";
import * as Sentry from "@sentry/cloudflare";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { createAuth } from "@/auth/create-auth";
import { parseEnv } from "@/config/env";
import { applyCorsHeaders, createOptionsResponse } from "@/http/cors";
import { jsonResponse } from "@/http/json";
import { handleStripeWebhook } from "@/modules/billing/handle-stripe-webhook";
import { createContext } from "@/trpc/context";
import { appRouter } from "@/trpc/router";

import type { EnvBindings, RuntimeEnv } from "@/config/env/schema";

const TRPC_ENDPOINT = "/trpc";
const AUTH_PREFIX = "/api/auth";
const STRIPE_WEBHOOK_PATH = "/webhooks/stripe";

async function handleRequest(request: Request, env: RuntimeEnv): Promise<Response> {
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
    const response = await fetchRequestHandler({
      endpoint: TRPC_ENDPOINT,
      req: request,
      router: appRouter,
      createContext: () => createContext({ env, request }),
      onError: ({ error, path, type }) => {
        // Expected 4xx-class TRPCErrors (UNAUTHORIZED, NOT_FOUND…) are not incidents.
        if (error.code === "INTERNAL_SERVER_ERROR") {
          Sentry.captureException(error.cause ?? error, {
            tags: { trpcPath: path ?? "unknown", trpcType: type },
          });
        }
      },
    });
    if (url.pathname.includes("menu.googleReviews")) {
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "no-store");
      headers.set("Pragma", "no-cache");
      return new Response(response.body, { headers, status: response.status, statusText: response.statusText });
    }
    return response;
  }

  return jsonResponse({ error: "No encontrado" }, { status: 404 });
}

export default Sentry.withSentry(
  (rawEnv: EnvBindings) => ({
    dsn: rawEnv.SENTRY_DSN || undefined,
    environment: rawEnv.NODE_ENV ?? "development",
    sendDefaultPii: false,
    tracesSampleRate: 0,
  }),
  {
    async fetch(request: Request, rawEnv: EnvBindings): Promise<Response> {
      const env = parseEnv(rawEnv);
      const response = await handleRequest(request, env);

      return applyCorsHeaders({ env, request, response });
    },
  },
);
