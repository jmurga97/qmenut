import { resolveTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";

import type { RuntimeEnv } from "../../config/env/schema";
import type { QmTenantThemeConfig, QmTenantThemeEditableConfig } from "@qmenut/ui/theme/tenant-theme-config";

export type TenantThemeInput = Omit<QmTenantThemeEditableConfig, "showDishPhoto" | "showMenuPhotos"> & {
  showDishPhoto?: boolean;
  showMenuPhotos?: boolean;
  plan?: QmTenantThemeConfig["plan"];
};

// Legacy KV key retained to avoid migrating every tenant's existing version entry.
function publicContentVersionKey(host: string): string {
  return `menuVersion:${host}`;
}

export async function getTheme(env: RuntimeEnv, host: string): Promise<QmTenantThemeConfig | null> {
  const theme = await env.TENANT_THEME.get(host, "json");

  // Reads are normalized without mutating KV so legacy partial entries keep their appearance
  // until the next explicit save.
  return theme === null ? null : resolveTenantThemeConfig(theme);
}

interface PutThemeInput {
  config: TenantThemeInput;
  env: RuntimeEnv;
  host: string;
}

export async function putTheme({ config, env, host }: PutThemeInput): Promise<void> {
  // Normalizes to a full preset object so KV always stores the complete config.
  await env.TENANT_THEME.put(host, JSON.stringify(resolveTenantThemeConfig(config)));
}

/** A "something changed" signal for the web edge cache, so the value is always a fresh timestamp. */
export async function bumpPublicContentVersion(env: RuntimeEnv, host: string): Promise<void> {
  await env.TENANT_THEME.put(publicContentVersionKey(host), Date.now().toString());
}
