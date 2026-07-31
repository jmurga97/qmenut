import { normalizeTenantHost } from "@qmenut/db/domain/tenant";
import { getRequestHost } from "@tanstack/react-start/server";

import { getEnvString } from "../lib/env";

import type { QmTemplateName } from "@qmenut/ui/theme/presets";

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

/** Bare `localhost` has no seeded tenant; `bun run dev` (plain vite, no `TENANT_HOST` pin) falls
 *  back to this seeded subdomain so the app has something to render out of the box. Exported so
 *  `tenant-theme.ts` can match its own (KV-backed, separately seeded) font/theme fallback to the
 *  same tenant — otherwise the preloaded fonts don't match what the menu actually renders. */
export const DEV_DEFAULT_TENANT_HOST = "fine.localhost";
export const DEV_DEFAULT_TENANT_TEMPLATE: QmTemplateName = "fine";

const IPV4_HOST_PATTERN = /^(?:\d{1,3}\.){3}\d{1,3}$/;

function isLocalDevelopmentHost(host: string): boolean {
  const unwrappedHost = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;

  return unwrappedHost === "localhost" || IPV4_HOST_PATTERN.test(unwrappedHost) || unwrappedHost.includes(":");
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

  const configuredHost = getEnvString("VITE_PUBLIC_MENU_HOST");

  if (requestHost) {
    const normalizedRequestHost = normalizeTenantHost(requestHost);

    // Bare `localhost` and LAN IPs (phone hitting the dev server) have no seeded tenant.
    if (import.meta.env.DEV && isLocalDevelopmentHost(normalizedRequestHost)) {
      return configuredHost ? normalizeTenantHost(configuredHost) : DEV_DEFAULT_TENANT_HOST;
    }

    return normalizedRequestHost;
  }

  return configuredHost ? normalizeTenantHost(configuredHost) : "";
}
