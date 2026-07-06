import { buildQmThemeVars } from "@qmenut/ui";
import { useMemo } from "react";

import { PublicBottomNav } from "~/shared/components/public-bottom-nav";
import { useTenantContext } from "~/shared/hooks/use-tenant-context";

import type { QmTemplateName } from "@qmenut/ui";
import type { ReactNode } from "react";
import type { PublicTenant } from "~/shared/types/public-tenant";

interface PublicPageShellProps {
  children: ReactNode;
  overlay?: ReactNode;
  template: QmTemplateName;
  tenant: PublicTenant;
}

export function PublicPageShell({ children, overlay, template, tenant }: PublicPageShellProps) {
  const { theme } = useTenantContext();

  const themeVars = useMemo(() => {
    // KV preset overrides only apply while the tenant's own template is active; switching
    // templates (dev switcher) falls back to that template's stock preset.
    const overrides = template === theme.template ? theme : {};

    return buildQmThemeVars({
      ...overrides,
      template,
      primary: tenant.primary,
      secondary: tenant.secondary,
    });
  }, [template, tenant.primary, tenant.secondary, theme]);

  return (
    <div className="home-shell" style={themeVars}>
      <div className="home-column">
        {children}
        <PublicBottomNav />
      </div>
      {overlay}
    </div>
  );
}
