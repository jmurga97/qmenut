import { normalizeTenantHost } from "@qmenut/db/domain/tenant";
import { TEMPLATES } from "@qmenut/ui/theme/presets";
import { resolveTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";

interface Env {
  ADMIN_TOKEN: string;
  TENANT_THEME: KVNamespace;
}

const THEME_ROUTE = /^\/tenants\/([^/]+)\/theme$/;

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
}

function isAuthorized(request: Request, env: Env): boolean {
  const header = request.headers.get("authorization") ?? "";

  return header === `Bearer ${env.ADMIN_TOKEN}`;
}

function parseThemeBody(raw: unknown): { error: string } | { value: string } {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { error: "Body must be a JSON object" };
  }

  const template = (raw as { template?: unknown }).template;

  if (typeof template !== "string" || !(template in TEMPLATES)) {
    return { error: `"template" must be one of: ${Object.keys(TEMPLATES).join(", ")}` };
  }

  // Normalizes to a full preset object so KV always stores the complete config.
  return { value: JSON.stringify(resolveTenantThemeConfig(raw)) };
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/health") {
    return jsonResponse({ status: "ok" });
  }

  const match = THEME_ROUTE.exec(url.pathname);

  if (!match?.[1]) {
    return jsonResponse({ error: "Not found" }, { status: 404 });
  }

  const host = normalizeTenantHost(decodeURIComponent(match[1]));

  if (!host) {
    return jsonResponse({ error: "Invalid tenant host" }, { status: 400 });
  }

  if (request.method === "GET") {
    const theme = await env.TENANT_THEME.get(host, "json");

    if (theme === null) {
      return jsonResponse({ error: "No theme configured for this tenant" }, { status: 404 });
    }

    return jsonResponse(theme);
  }

  if (!isAuthorized(request, env)) {
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

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
};
