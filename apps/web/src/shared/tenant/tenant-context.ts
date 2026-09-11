import type { QmTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";

export interface TenantContext {
  host: string;
  theme: QmTenantThemeConfig;
  fontStyles: Array<{ children: string; id: string; type: "text/css" }>;
}
