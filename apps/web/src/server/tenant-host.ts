import { normalizeTenantHost } from "@qmenut/db/domain/tenant";
import { getRequestHost } from "@tanstack/react-start/server";

function getEnvString(key: string): string | undefined {
  const value = (import.meta.env as Record<string, unknown>)[key];

  if (typeof value !== "string") {
    return undefined;
  }

  return value.trim() || undefined;
}

async function readWorkerVar(key: string): Promise<string | undefined> {
  try {
    // eslint-disable-next-line import/no-unresolved -- runtime module provided by workerd
    const { env } = await import("cloudflare:workers");
    const value = (env as Record<string, unknown>)[key];

    if (typeof value !== "string") {
      return undefined;
    }

    return value.trim() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolves the tenant host during SSR. A `TENANT_HOST` worker var pins an instance to one tenant
 * (the N-workers-per-domain setup); otherwise the incoming request's Host header decides, with
 * `VITE_PUBLIC_MENU_HOST` as the local fallback.
 */
export async function resolveSsrTenantHost(): Promise<string> {
  const pinnedHost = await readWorkerVar("TENANT_HOST");

  if (pinnedHost) {
    return normalizeTenantHost(pinnedHost);
  }

  let requestHost: string | undefined;

  try {
    requestHost = getRequestHost({ xForwardedHost: true }) ?? undefined;
  } catch {
    requestHost = undefined;
  }

  if (requestHost) {
    return normalizeTenantHost(requestHost);
  }

  const configuredHost = getEnvString("VITE_PUBLIC_MENU_HOST");

  return configuredHost ? normalizeTenantHost(configuredHost) : "";
}
