import { useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useEffect } from "react";

import { getPublicMenuQueryOptions } from "~/features/menu/api/public-menu-query-options";
import { registerTenantProperties, scheduleAnalyticsLoad } from "~/lib/analytics/posthog";
import { useAppTrpc } from "~/shared/hooks/use-app-trpc";
import { useTenantContext } from "~/shared/hooks/use-tenant-context";

/**
 * Registra las dimensiones de tenant (restaurant_id, branch_id, host) como super
 * properties de PostHog y programa la carga diferida del SDK. Los datos salen de la
 * caché de `menu.publicData`, que el layout de locale ya garantiza en su beforeLoad.
 */
export function AnalyticsBootstrap() {
  const trpc = useAppTrpc();
  const queryClient = useQueryClient();
  const { host } = useTenantContext();
  const { locale } = useRouteContext({ from: "/{-$locale}" });

  useEffect(() => {
    const data = queryClient.getQueryData(getPublicMenuQueryOptions({ host, locale, trpc }).queryKey);

    registerTenantProperties({
      tenant_host: host,
      ...(data ? { restaurant_id: data.branch.restaurantId, branch_id: data.branch.id } : {}),
    });
    scheduleAnalyticsLoad();
  }, [host, locale, queryClient, trpc]);

  return null;
}
