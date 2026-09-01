import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { getPublicMenuQueryOptions } from "~/features/menu/api/public-menu-query-options";
import { mapPublicHighlightsContent } from "~/features/promos/mappers/map-public-highlights-content";
import { usePublicRouteLayout } from "~/shared/components/public-route-layout/public-route-layout-context";
import { useAppTrpc } from "~/shared/hooks/use-app-trpc";
import { useTenantContext } from "~/shared/hooks/use-tenant-context";

export function useHighlightsContent() {
  const trpc = useAppTrpc();
  const { host } = useTenantContext();
  const { locale } = useRouteContext({ from: "/{-$locale}" });
  const { i18n, t } = useTranslation();
  const { displayCurrency } = usePublicRouteLayout();
  const { data } = useSuspenseQuery(getPublicMenuQueryOptions({ host, locale, trpc }));

  if (!data) {
    return mapPublicHighlightsContent({ data: null, displayCurrency, locale: i18n.language, t });
  }

  return mapPublicHighlightsContent({ data, displayCurrency, locale: i18n.language, t });
}
