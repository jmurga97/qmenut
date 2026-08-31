import { normalizeTenantHost } from "@qmenut/db/domain/tenant";
import { TEMPLATES } from "@qmenut/ui/theme/presets";
import { resolveTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";

interface Env {
  THEME_WORKER_TOKEN: string;
  TENANT_THEME: KVNamespace;
}

const THEME_ROUTE = /^\/tenants\/([^/]+)\/theme$/;
// Legacy route retained for compatibility with already deployed API workers.
const PUBLIC_CONTENT_VERSION_ROUTE = /^\/tenants\/([^/]+)\/menu-version$/;

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return Response.json(body, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
}

async function isAuthorized(request: Request, env: Env): Promise<boolean> {
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.THEME_WORKER_TOKEN}`;
  const encoder = new TextEncoder();
  const [actualDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(header)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);

  return crypto.subtle.timingSafeEqual(actualDigest, expectedDigest);
}

function parseThemeBody(raw: unknown): { error: string } | { value: string } {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { error: "Body must be a JSON object" };
  }

  const template = (raw as { template?: unknown }).template;

  if (typeof template !== "string" || !Object.hasOwn(TEMPLATES, template)) {
    return { error: `"template" must be one of: ${Object.keys(TEMPLATES).join(", ")}` };
  }

  // Normalizes to a full preset object so KV always stores the complete config.
  return { value: JSON.stringify(resolveTenantThemeConfig(raw)) };
}

interface TenantRequestInput {
  env: Env;
  host: string;
  request: Request;
}

async function handleThemeRequest({ request, env, host }: TenantRequestInput): Promise<Response> {
  if (request.method === "GET") {
    const theme = await env.TENANT_THEME.get(host, "json");

    if (theme === null) {
      return jsonResponse({ error: "No theme configured for this tenant" }, { status: 404 });
    }

    // Reads are normalized without mutating KV so legacy partial entries retain their
    // current appearance until the next explicit save.
    return jsonResponse(resolveTenantThemeConfig(theme));
  }

  if (!(await isAuthorized(request, env))) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.method === "PUT") {
    let raw: unknown;

    try {
      raw = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseThemeBody(raw);

    if ("error" in parsed) {
      return jsonResponse({ error: parsed.error }, { status: 400 });
    }

    await env.TENANT_THEME.put(host, parsed.value);

    return jsonResponse({ host, status: "saved" });
  }

  if (request.method === "DELETE") {
    await env.TENANT_THEME.delete(host);

    return jsonResponse({ host, status: "deleted" });
  }

  return jsonResponse({ error: "Method not allowed" }, { status: 405 });
}

function publicContentVersionKey(host: string): string {
  // Legacy KV key retained to avoid migrating every tenant's existing version entry.
  return `menuVersion:${host}`;
}

/**
 * Bumps to the current timestamp rather than accepting a caller-supplied value — this is a
 * "something changed" signal for cache invalidation, not a value the caller should control.
 */
async function handlePublicContentVersionRequest({ request, env, host }: TenantRequestInput): Promise<Response> {
  if (request.method === "GET") {
    const version = await env.TENANT_THEME.get(publicContentVersionKey(host));

    return jsonResponse({ host, version });
  }

  if (!(await isAuthorized(request, env))) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.method === "PUT") {
    const version = Date.now().toString();

    await env.TENANT_THEME.put(publicContentVersionKey(host), version);

    return jsonResponse({ host, version, status: "bumped" });
  }

  return jsonResponse({ error: "Method not allowed" }, { status: 405 });
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/health") {
    return jsonResponse({ status: "ok" });
  }

  const themeMatch = THEME_ROUTE.exec(url.pathname);
  const publicContentVersionMatch = PUBLIC_CONTENT_VERSION_ROUTE.exec(url.pathname);
  const match = themeMatch ?? publicContentVersionMatch;

  if (!match?.[1]) {
    return jsonResponse({ error: "Not found" }, { status: 404 });
  }

  const host = normalizeTenantHost(decodeURIComponent(match[1]));

  if (!host) {
    return jsonResponse({ error: "Invalid tenant host" }, { status: 400 });
  }

  return themeMatch
    ? handleThemeRequest({ request, env, host })
    : handlePublicContentVersionRequest({ request, env, host });
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
};
