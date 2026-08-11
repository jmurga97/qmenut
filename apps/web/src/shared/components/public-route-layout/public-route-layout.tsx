import { Outlet } from "@tanstack/react-router";
import { useMemo, useRef } from "react";

import { PublicPageShell } from "~/shared/components/public-page-shell";
import { PublicRouteHeader } from "~/shared/components/public-route-layout/public-route-header";
import { PublicRouteLayoutContext } from "~/shared/components/public-route-layout/public-route-layout-context";
import { TenantNotFound } from "~/shared/components/tenant-not-found";
import { usePublicTenant } from "~/shared/hooks/use-public-tenant";
import { useTemplateSelection } from "~/shared/hooks/use-template-selection";

export function PublicRouteLayout() {
  const { tenant } = usePublicTenant();
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
      <PublicPageShell tenant={tenant} template={template}>
        <PublicRouteHeader scrollContainerRef={scrollContainerRef} template={template} tenant={tenant} />
        <div className="home-scroll" ref={scrollContainerRef}>
          <Outlet />
        </div>
      </PublicPageShell>
    </PublicRouteLayoutContext.Provider>
  );
}
