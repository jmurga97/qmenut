import { resolveTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";
import { createServerFn } from "@tanstack/react-start";

import type { QmTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";

export interface TenantContext {
  host: string;
  theme: QmTenantThemeConfig;
}

async function readTenantThemeFromKv(host: string): Promise<unknown> {
  if (!host) {
    return null;
  }

  try {
    // eslint-disable-next-line import/no-unresolved -- runtime module provided by workerd
    const { env } = await import("cloudflare:workers");
    const kv = (env as { TENANT_THEME?: { get(key: string, type: "json"): Promise<unknown> } }).TENANT_THEME;

    return (await kv?.get(host, "json")) ?? null;
  } catch {
    return null;
  }
}

export const getTenantContext = createServerFn({ method: "GET" }).handler(async (): Promise<TenantContext> => {
  const { resolveSsrTenantHost } = await import("./tenant-host");
  const host = await resolveSsrTenantHost();
  const raw = await readTenantThemeFromKv(host);

  return { host, theme: resolveTenantThemeConfig(raw) };
});
