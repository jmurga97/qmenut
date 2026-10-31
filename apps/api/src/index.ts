import { createDb } from "@qmenut/db/client";
import * as Sentry from "@sentry/cloudflare";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { createAuth } from "@/auth/create-auth";
import { parseEnv } from "@/config/env";
import { applyCorsHeaders, createOptionsResponse } from "@/http/cors";
import { jsonResponse } from "@/http/json";
import { publishPendingImages } from "@/modules/admin-images/image-finalization";
import { runAnalyticsDailyJob } from "@/modules/analytics/digest/run-analytics-daily-job";
import { handleStripeWebhook } from "@/modules/billing/handle-stripe-webhook";
import { handleMessagingEvents } from "@/modules/messaging/handle-messaging-events";
import { consumePushMessages, runNotificationMaintenance } from "@/modules/notifications/notification-jobs";
import { runReservationJobs } from "@/modules/reservations/reservation-jobs";
import { createContext } from "@/trpc/context";
import { appRouter } from "@/trpc/router";

import type { EnvBindings, PushMessage, RuntimeEnv } from "@/config/env/schema";

export { ImageMaintenanceRpc } from "@/modules/admin-images/image-maintenance.rpc";

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
    return fetchRequestHandler({
      endpoint: TRPC_ENDPOINT,
      req: request,
      router: appRouter,
      createContext: () => createContext({ env, request }),
      // Reviews are rate-limited per visitor; a batched response containing them must never be cached.
      responseMeta: ({ paths }) =>
        paths?.includes("menu.googleReviews") ? { headers: { "Cache-Control": "no-store" } } : {},
      onError: ({ error, path, type }) => {
        // Expected 4xx-class TRPCErrors (UNAUTHORIZED, NOT_FOUND…) are not incidents.
        if (error.code === "INTERNAL_SERVER_ERROR") {
          Sentry.captureException(error.cause ?? error, {
            tags: { trpcPath: path ?? "unknown", trpcType: type },
          });
        }
      },
    });
  }

  return jsonResponse({ error: "No encontrado" }, { status: 404 });
}

async function handleScheduledAnalytics(rawEnv: EnvBindings): Promise<void> {
  try {
    await runAnalyticsDailyJob(rawEnv);
  } catch (error) {
    Sentry.captureException(error, { tags: { module: "analytics-cron" } });
  }
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
    // eslint-disable-next-line max-params -- Cloudflare ScheduledHandler contract.
    scheduled(controller: ScheduledController, rawEnv: EnvBindings, ctx: ExecutionContext): void {
      // Cron diario de producción: sincroniza PostHog → D1 y despacha el digest quincenal.
      if (controller.cron === "45 4 * * *") ctx.waitUntil(handleScheduledAnalytics(rawEnv));
      else {
        const env = parseEnv(rawEnv);
        ctx.waitUntil(
          Promise.allSettled([publishPendingImages(env), runNotificationMaintenance(env), runReservationJobs(env)]),
        );
      }
    },
    async queue(batch: MessageBatch<unknown>, rawEnv: EnvBindings): Promise<void> {
      if (batch.queue.startsWith("qmenut-notifications")) {
        await consumePushMessages(batch as MessageBatch<PushMessage>, parseEnv(rawEnv));
      } else if (batch.queue.startsWith("ming-msg-events-")) {
        await handleMessagingEvents(batch, parseEnv(rawEnv));
      }
    },
  },
);
