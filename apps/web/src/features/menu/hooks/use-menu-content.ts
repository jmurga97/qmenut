import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { mapPublicMenuContent } from "~/features/menu/mappers/map-public-menu-content";
import { usePublicRouteLayout } from "~/shared/components/public-route-layout/public-route-layout-context";
import { useAppTrpc } from "~/shared/hooks/use-app-trpc";
import { useTenantContext } from "~/shared/hooks/use-tenant-context";
import { getPublicMenuQueryOptions } from "~/shared/public-menu/public-menu-query-options";

import type { MenuContentViewModel } from "~/shared/public-menu/menu-view-model";

export function useMappedMenuContent({ enabled }: { enabled: boolean }): MenuContentViewModel | null {
  const trpc = useAppTrpc();
  const { host } = useTenantContext();
  const { effectiveLocale, locale } = useRouteContext({ from: "/{-$locale}" });
  const { t } = useTranslation();
  const { displayCurrency } = usePublicRouteLayout();
  const { data } = useSuspenseQuery(getPublicMenuQueryOptions({ host, locale, trpc }));

  return useMemo(
    () => (enabled && data ? mapPublicMenuContent({ data, displayCurrency, locale: effectiveLocale, t }) : null),
    [data, displayCurrency, effectiveLocale, enabled, t],
  );
}
