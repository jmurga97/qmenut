import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { mapPublicContactContent } from "~/features/contact/mappers/map-public-contact-content";
import { getPublicMenuQueryOptions } from "~/features/menu/api/public-menu-query-options";
import { useAppTrpc } from "~/shared/hooks/use-app-trpc";
import { useTenantContext } from "~/shared/hooks/use-tenant-context";

export function useContactContent() {
  const trpc = useAppTrpc();
  const { host } = useTenantContext();
  const { locale } = useRouteContext({ from: "/{-$locale}" });
  const { i18n, t } = useTranslation();
  const { data } = useSuspenseQuery(getPublicMenuQueryOptions({ host, locale, trpc }));

  return mapPublicContactContent({ data: data ?? null, locale: i18n.language, t });
}
