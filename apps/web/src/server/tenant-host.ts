import { normalizeTenantHost } from "@qmenut/db/domain/tenant";
import { getRequestHost } from "@tanstack/react-start/server";

import { getEnvString } from "../lib/env";

import type { QmTemplateName } from "@qmenut/ui/theme/presets";

/** Bare `localhost` has no seeded tenant; `bun run dev` falls
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

function normalizeWithDevFallback(rawHost: string | null | undefined): string {
  if (!rawHost) {
    return "";
  }

  const normalizedRequestHost = normalizeTenantHost(rawHost);

  // Bare `localhost` and LAN IPs (phone hitting the dev server) have no seeded tenant.
  if (import.meta.env.DEV && isLocalDevelopmentHost(normalizedRequestHost)) {
    const configuredHost = getEnvString("VITE_PUBLIC_MENU_HOST");

    return configuredHost ? normalizeTenantHost(configuredHost) : DEV_DEFAULT_TENANT_HOST;
  }

  return normalizedRequestHost;
}

/** Resolves the tenant host inside the TanStack Start request context. */
export function resolveSsrTenantHost(): string {
  try {
    return normalizeWithDevFallback(getRequestHost());
  } catch {
    return "";
  }
}

/** Resolves the tenant host before TanStack Start establishes its request context. */
export function resolveRequestTenantHost(request: Request): string {
  const urlHost = new URL(request.url).host;

  return normalizeWithDevFallback(urlHost || request.headers.get("host"));
}
