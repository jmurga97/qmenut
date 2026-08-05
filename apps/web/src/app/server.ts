// Must run before anything that imports @qmenut/ui components.
import "~/server/lit-dom-shim";

import * as Sentry from "@sentry/cloudflare";
import handler from "@tanstack/react-start/server-entry";

import { getEnvString } from "~/lib/env";
import { serveWithEdgeCache } from "~/server/edge-cache";

const LOCAL_API_ORIGIN = "http://localhost:8787";

function resolveApiProxyUrl(request: Request): URL {
  const configuredOrigin = getEnvString("VITE_API_BASE_URL") ?? LOCAL_API_ORIGIN;
  const requestUrl = new URL(request.url);

  return new URL(requestUrl.pathname + requestUrl.search, configuredOrigin);
}

function proxyTrpcRequest(request: Request, env: Cloudflare.Env): Promise<Response> {
  if (env.API_WORKER) {
    return env.API_WORKER.fetch(request);
  }

  return fetch(new Request(resolveApiProxyUrl(request), request));
}

export default Sentry.withSentry<Cloudflare.Env>(
  (env) =>
    env.SENTRY_DSN
      ? {
          dsn: env.SENTRY_DSN,
          environment: "production",
          sendDefaultPii: false,
          tracesSampleRate: 0,
        }
      : undefined,
  {
    // Cloudflare's ExportedHandler contract requires request, env, and execution context.
    // eslint-disable-next-line max-params
    async fetch(request, env, ctx) {
      if (new URL(request.url).pathname.startsWith("/trpc")) {
        return proxyTrpcRequest(request, env);
      }

      const response = await serveWithEdgeCache({
        ctx,
        request,
        render: () => handler.fetch(request),
      });

      // TanStack converts SSR errors into responses before the Worker wrapper sees them.
      if (response.status >= 500) {
        const { pathname } = new URL(request.url);
        Sentry.captureException(new Error(`SSR responded ${response.status} at ${pathname}`), {
          tags: { host: request.headers.get("host") ?? "unknown" },
        });
      }

      return response;
    },
  },
);
