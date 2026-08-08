import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { getPublicMenuQueryOptions } from "~/features/menu/api/public-menu-query-options";
import { mapPublicPromosContent } from "~/features/promos/mappers/map-public-promos-content";
import { useAppTrpc } from "~/shared/hooks/use-app-trpc";
import { useTenantContext } from "~/shared/hooks/use-tenant-context";

export function usePromosContent() {
  const trpc = useAppTrpc();
  const { host } = useTenantContext();
  const { locale } = useRouteContext({ from: "/{-$locale}" });
  const { i18n, t } = useTranslation();
  const { data } = useSuspenseQuery(getPublicMenuQueryOptions({ host, locale, trpc }));

  if (!data) {
    return mapPublicPromosContent({ data: null, locale: i18n.language, t });
  }

  return mapPublicPromosContent({ data, locale: i18n.language, t });
}
