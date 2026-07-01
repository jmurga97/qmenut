import type { RuntimeEnv } from "@/config/env/schema";

const DEFAULT_ALLOWED_METHODS = "GET,POST,OPTIONS";
const DEFAULT_ALLOWED_HEADERS = "Content-Type,Authorization";

function parseAllowedOrigins(value: string | undefined): Set<string> {
  return new Set(
    value
      ?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [],
  );
}

function resolveOrigin(request: Request, env: RuntimeEnv): string | null {
  const origin = request.headers.get("origin");

  if (!origin) {
    return null;
  }

  if (env.NODE_ENV !== "production") {
    return origin;
  }

  return parseAllowedOrigins(env.ALLOWED_ORIGINS).has(origin) ? origin : null;
}

interface ApplyCorsHeadersInput {
  env: RuntimeEnv;
  request: Request;
  response: Response;
}

export function applyCorsHeaders({ env, request, response }: ApplyCorsHeadersInput): Response {
  const origin = resolveOrigin(request, env);
  const headers = new Headers(response.headers);

  if (origin) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-credentials", "true");
    headers.set("vary", "Origin");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function createOptionsResponse(request: Request, env: RuntimeEnv): Response {
  const origin = resolveOrigin(request, env);
  const headers = new Headers({
    "access-control-allow-headers": request.headers.get("access-control-request-headers") ?? DEFAULT_ALLOWED_HEADERS,
    "access-control-allow-methods": DEFAULT_ALLOWED_METHODS,
    "access-control-max-age": "86400",
  });

  if (origin) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-credentials", "true");
    headers.set("vary", "Origin");
  }

  return new Response(null, { status: 204, headers });
}
