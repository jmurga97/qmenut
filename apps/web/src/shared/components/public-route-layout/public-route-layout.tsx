import { useMemo, useRef } from "react";

import { PublicPageShell } from "~/shared/components/public-page-shell";
import { PublicRouteContentTransition } from "~/shared/components/public-route-layout/public-route-content-transition";
import { PublicRouteHeader } from "~/shared/components/public-route-layout/public-route-header";
import { PublicRouteLayoutContext } from "~/shared/components/public-route-layout/public-route-layout-context";
import { TenantNotFound } from "~/shared/components/tenant-not-found";
import { usePublicTenant } from "~/shared/hooks/use-public-tenant";
import { useTemplateSelection } from "~/shared/hooks/use-template-selection";
import { useTenantContext } from "~/shared/hooks/use-tenant-context";
import { useThemePreview } from "~/shared/hooks/use-theme-preview";

export function PublicRouteLayout() {
  const { theme: persistedTheme } = useTenantContext();
  const theme = useThemePreview(persistedTheme);
  const { tenant } = usePublicTenant(theme);
  const { template } = useTemplateSelection(tenant);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const layoutContextValue = useMemo(
    () => (tenant ? { scrollContainerRef, template, tenant } : null),
    [template, tenant],
  );

  if (!tenant || !layoutContextValue) {
    return <TenantNotFound />;
  }

  return (
    <PublicRouteLayoutContext.Provider value={layoutContextValue}>
      <PublicPageShell tenant={tenant} template={template} theme={theme}>
        <PublicRouteHeader scrollContainerRef={scrollContainerRef} template={template} tenant={tenant} />
        <div className="home-scroll" ref={scrollContainerRef}>
          <PublicRouteContentTransition />
        </div>
      </PublicPageShell>
    </PublicRouteLayoutContext.Provider>
  );
}
