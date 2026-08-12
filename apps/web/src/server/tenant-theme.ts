import { resolveTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";
import { createServerFn } from "@tanstack/react-start";

import type { QmTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";

export interface TenantContext {
  host: string;
  theme: QmTenantThemeConfig;
}

const clientTenantContextCache: { promise?: Promise<TenantContext> } = {};

async function readTenantThemeFromKv(host: string): Promise<unknown> {
  if (!host || !import.meta.env.SSR) {
    return null;
  }

  // Client-reachable modules must guard this dynamic runtime import with import.meta.env.SSR.
  const { env } = await import("cloudflare:workers");

  return (await env.TENANT_THEME?.get(host, "json")) ?? null;
}

export async function readTenantTheme(
  host: string,
  fallbackTemplate?: QmTenantThemeConfig["template"],
): Promise<QmTenantThemeConfig> {
  const raw = await readTenantThemeFromKv(host);

  return resolveTenantThemeConfig(raw, fallbackTemplate);
}

export const getTenantContext = createServerFn({ method: "GET" }).handler(async (): Promise<TenantContext> => {
  const { DEV_DEFAULT_TENANT_HOST, DEV_DEFAULT_TENANT_TEMPLATE, resolveSsrTenantHost } = await import("./tenant-host");
  const host = resolveSsrTenantHost();
  const fallbackTemplate =
    import.meta.env.DEV && host === DEV_DEFAULT_TENANT_HOST ? DEV_DEFAULT_TENANT_TEMPLATE : undefined;

  return { host, theme: await readTenantTheme(host, fallbackTemplate) };
});

/** Reuses immutable tenant configuration for client navigations, never across SSR requests. */
export function getCachedTenantContext(): Promise<TenantContext> {
  if (typeof window === "undefined") {
    return getTenantContext();
  }

  clientTenantContextCache.promise ??= getTenantContext();

  return clientTenantContextCache.promise;
}
