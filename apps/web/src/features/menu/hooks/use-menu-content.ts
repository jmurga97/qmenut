import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { getPublicMenuQueryOptions } from "~/features/menu/api/public-menu-query-options";
import { mapPublicMenuContent } from "~/features/menu/mappers/map-public-menu-content";
import { useAppTrpc } from "~/shared/hooks/use-app-trpc";
import { useTenantContext } from "~/shared/hooks/use-tenant-context";

import type { MenuContentViewModel } from "~/features/menu/types/menu-view-model";

export function useMenuContent(): MenuContentViewModel | null {
  const trpc = useAppTrpc();
  const { host } = useTenantContext();
  const { effectiveLocale, locale } = useRouteContext({ from: "/{-$locale}" });
  const { t } = useTranslation();
  const { data } = useSuspenseQuery(getPublicMenuQueryOptions({ host, locale, trpc }));

  return useMemo(
    () => (data ? mapPublicMenuContent({ data, locale: effectiveLocale, t }) : null),
    [data, effectiveLocale, t],
  );
}
