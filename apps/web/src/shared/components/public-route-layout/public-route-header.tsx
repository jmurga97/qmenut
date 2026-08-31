import { useRouterState } from "@tanstack/react-router";

import { MenuRouteHeader } from "~/shared/components/public-route-layout/menu-route-header";
import { usePublicRouteLayout } from "~/shared/components/public-route-layout/public-route-layout-context";
import { StandardRouteHeader } from "~/shared/components/public-route-layout/standard-route-header";
import { useLocale } from "~/shared/hooks/use-locale";

import type { QmTemplateName } from "@qmenut/ui/theme/presets";
import type { RefObject } from "react";
import type { PublicTenant } from "~/shared/types/public-tenant";

interface PublicRouteHeaderProps {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  template: QmTemplateName;
  tenant: PublicTenant;
}

export function PublicRouteHeader({ scrollContainerRef, template, tenant }: PublicRouteHeaderProps) {
  const routeId = useRouterState({ select: (state) => state.matches.at(-1)?.routeId });
  const locale = useLocale();
  const { currencyLabel, currencyOptions, displayCurrency, handleCurrencyChange } = usePublicRouteLayout();

  if (routeId === "/{-$locale}/") {
    return (
      <MenuRouteHeader
        key={routeId}
        locale={locale}
        scrollContainerRef={scrollContainerRef}
        template={template}
        tenant={tenant}
        currencyLabel={currencyLabel}
        currencyOptions={currencyOptions}
        currencyValue={displayCurrency}
        onQmCurrencyChange={handleCurrencyChange}
      />
    );
  }

  return (
    <StandardRouteHeader
      key={routeId}
      locale={locale}
      routeId={routeId}
      scrollContainerRef={scrollContainerRef}
      tenant={tenant}
      currencyLabel={currencyLabel}
      currencyOptions={currencyOptions}
      currencyValue={displayCurrency}
      onQmCurrencyChange={handleCurrencyChange}
    />
  );
}
