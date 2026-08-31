import { useMemo, useRef } from "react";

import { PublicPageShell } from "~/shared/components/public-page-shell";
import { PublicRouteContentTransition } from "~/shared/components/public-route-layout/public-route-content-transition";
import { PublicRouteHeader } from "~/shared/components/public-route-layout/public-route-header";
import { PublicRouteLayoutContext } from "~/shared/components/public-route-layout/public-route-layout-context";
import { TenantNotFound } from "~/shared/components/tenant-not-found";
import { usePublicCurrency } from "~/shared/hooks/use-public-currency";
import { usePublicTenant } from "~/shared/hooks/use-public-tenant";
import { useTemplateSelection } from "~/shared/hooks/use-template-selection";

export function PublicRouteLayout() {
  const { tenant } = usePublicTenant();
  const { template } = useTemplateSelection(tenant);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currency = usePublicCurrency({
    sourceCurrency: tenant?.sourceCurrency ?? "USD",
    vesExchangeRate: tenant?.vesExchangeRate ?? null,
    vesPricesEnabled: tenant?.vesPricesEnabled ?? false,
  });
  const layoutContextValue = useMemo(
    () => (tenant ? { ...currency, scrollContainerRef, template, tenant } : null),
    [currency, template, tenant],
  );

  if (!tenant || !layoutContextValue) {
    return <TenantNotFound />;
  }

  return (
    <PublicRouteLayoutContext.Provider value={layoutContextValue}>
      <PublicPageShell tenant={tenant} template={template}>
        <PublicRouteHeader scrollContainerRef={scrollContainerRef} template={template} tenant={tenant} />
        <div className="home-scroll" ref={scrollContainerRef}>
          <PublicRouteContentTransition />
        </div>
      </PublicPageShell>
    </PublicRouteLayoutContext.Provider>
  );
}
