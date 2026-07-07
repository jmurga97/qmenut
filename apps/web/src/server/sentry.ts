import * as Sentry from "@sentry/cloudflare";

interface WorkersRuntime {
  env?: { NODE_ENV?: string; SENTRY_DSN?: string };
  waitUntil?: (promise: Promise<unknown>) => void;
}

async function resolveWorkersRuntime(): Promise<WorkersRuntime | null> {
  try {
    // eslint-disable-next-line import/no-unresolved -- runtime module provided by workerd
    return (await import("cloudflare:workers"));
  } catch {
    return null;
  }
}

/**
 * Per-request Sentry wrapper for the SSR worker. Nitro (preset cloudflare-module) owns the
 * top-level worker export, so `withSentry` never sees `env`/`ctx` here — instead each request
 * builds a scoped client via `wrapRequestHandler`, with flushing wired through the module-level
 * `waitUntil` from `cloudflare:workers`.
 *
 * h3 converts SSR errors into 500 responses before they reach this wrapper, so besides captured
 * exceptions we also report any 5xx response (no server stack, but "the menu is down" is exactly
 * the signal we need; stacks come from the api worker and the browser SDK).
 */
export async function serveWithSentry(request: Request, next: () => Promise<Response>): Promise<Response> {
  const runtime = await resolveWorkersRuntime();
  const dsn = runtime?.env?.SENTRY_DSN;

  if (!dsn) {
    return next();
  }

  const context = runtime?.waitUntil
    ? ({ waitUntil: runtime.waitUntil, passThroughOnException: () => undefined, props: {} } as ExecutionContext)
    : undefined;

  return Sentry.wrapRequestHandler(
    {
      options: {
        dsn,
        environment: runtime?.env?.NODE_ENV ?? "production",
        sendDefaultPii: false,
        tracesSampleRate: 0,
      },
      request,
      context,
    },
    async () => {
      const response = await next();

      if (response.status >= 500) {
        const { pathname } = new URL(request.url);
        Sentry.captureException(new Error(`SSR responded ${response.status} at ${pathname}`), {
          tags: { host: request.headers.get("host") ?? "unknown" },
        });
      }

      return response;
    },
  );
}
