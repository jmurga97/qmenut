import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { getPublicMenuQueryOptions } from "~/features/menu/api/public-menu-query-options";
import { mapPublicHighlightsContent } from "~/features/promos/mappers/map-public-highlights-content";
import { useAppTrpc } from "~/shared/hooks/use-app-trpc";
import { useTenantContext } from "~/shared/hooks/use-tenant-context";

export function useHighlightsContent() {
  const trpc = useAppTrpc();
  const { host } = useTenantContext();
  const { locale } = useRouteContext({ from: "/{-$locale}" });
  const { i18n, t } = useTranslation();
  const { data } = useSuspenseQuery(getPublicMenuQueryOptions({ host, locale, trpc }));

  if (!data) {
    return mapPublicHighlightsContent({ data: null, locale: i18n.language, t });
  }

  return mapPublicHighlightsContent({ data, locale: i18n.language, t });
}
