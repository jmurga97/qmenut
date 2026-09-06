import { TEMPLATES } from "@qmenut/ui/theme/presets";
import { useRouterState } from "@tanstack/react-router";
import { useMemo, useRef } from "react";

import { MenuContentProvider } from "~/features/menu/hooks/menu-content-context";
import { PublicPageShell } from "~/shared/components/public-page-shell";
import { PublicRouteContentTransition } from "~/shared/components/public-route-layout/public-route-content-transition";
import { PublicRouteHeader } from "~/shared/components/public-route-layout/public-route-header";
import { PublicRouteLayoutContext } from "~/shared/components/public-route-layout/public-route-layout-context";
import { TenantNotFound } from "~/shared/components/tenant-not-found";
import { usePublicCurrency } from "~/shared/hooks/use-public-currency";
import { usePublicTenant } from "~/shared/hooks/use-public-tenant";
import { useTemplateSelection } from "~/shared/hooks/use-template-selection";
import { useTenantContext } from "~/shared/hooks/use-tenant-context";
import { useThemePreview } from "~/shared/hooks/use-theme-preview";

export function PublicRouteLayout() {
  const { theme: persistedTheme } = useTenantContext();
  const theme = useThemePreview(persistedTheme);
  const { tenant } = usePublicTenant(theme);
  const { template } = useTemplateSelection(tenant);
  const routeId = useRouterState({ select: (state) => state.matches.at(-1)?.routeId });
  const isMenuRoute = routeId === "/{-$locale}/";
  const useHeroHeader =
    isMenuRoute && (TEMPLATES[template].photoMode === "hero" || TEMPLATES[template].photoMode === "heroxl");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currency = usePublicCurrency({
    sourceCurrency: tenant?.sourceCurrency ?? "USD",
    vesExchangeRate: tenant?.vesExchangeRate ?? null,
    vesPricesEnabled: tenant?.vesPricesEnabled ?? false,
  });
  const layoutContextValue = useMemo(
    () => (tenant ? { ...currency, scrollContainerRef, template, tenant, theme } : null),
    [currency, template, tenant, theme],
  );

  if (!tenant || !layoutContextValue) {
    return <TenantNotFound />;
  }

  const layout = (
    <PublicPageShell tenant={tenant} template={template} theme={theme}>
      {useHeroHeader ? (
        <PublicRouteHeader scrollContainerRef={scrollContainerRef} template={template} tenant={tenant} />
      ) : null}
      <div className="home-scroll" ref={scrollContainerRef}>
        {useHeroHeader ? null : (
          <PublicRouteHeader scrollContainerRef={scrollContainerRef} template={template} tenant={tenant} />
        )}
        <PublicRouteContentTransition />
      </div>
    </PublicPageShell>
  );

  return (
    <PublicRouteLayoutContext.Provider value={layoutContextValue}>
      <MenuContentProvider>{layout}</MenuContentProvider>
    </PublicRouteLayoutContext.Provider>
  );
}
