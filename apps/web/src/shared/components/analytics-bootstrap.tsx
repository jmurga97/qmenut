import { useQueryClient } from "@tanstack/react-query";
import { useRouteContext, useSearch } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { getPublicMenuQueryOptions } from "~/features/menu/api/public-menu-query-options";
import { registerTenantProperties, scheduleAnalyticsLoad, track } from "~/lib/analytics/posthog";
import { useAppTrpc } from "~/shared/hooks/use-app-trpc";
import { useTenantContext } from "~/shared/hooks/use-tenant-context";

/**
 * Registra las dimensiones de tenant (restaurant_id, branch_id, host, zona horaria) como
 * super properties de PostHog y programa la carga diferida del SDK. Los datos salen de la
 * caché de `menu.publicData`, que el layout de locale ya garantiza en su beforeLoad.
 * Si la entrada trae `utm_source=qr`, emite el evento puntual `qr_visit`: una carga
 * atribuible a enlace QR, no un escaneo físico ni un visitante único.
 */
export function AnalyticsBootstrap() {
  const trpc = useAppTrpc();
  const queryClient = useQueryClient();
  const { host } = useTenantContext();
  const { effectiveLocale, locale } = useRouteContext({ from: "/{-$locale}" });
  const { fromQr } = useSearch({ from: "/{-$locale}" });
  const qrVisitFired = useRef(false);

  useEffect(() => {
    const data = queryClient.getQueryData(getPublicMenuQueryOptions({ host, locale, trpc }).queryKey);

    registerTenantProperties({
      tenantHost: host,
      // Splits installed-app sessions from browser sessions on every event, which is the
      // number that shows a restaurant what the PWA is actually worth.
      displayMode: window.matchMedia("(display-mode: standalone)").matches ? "standalone" : "browser",
      // Effective language of the visit, not the URL prefix the visitor happened to type.
      locale: effectiveLocale,
      ...(data && { restaurantId: data.branch.restaurantId, branchId: data.branch.id }),
      // Public dimension used only to compute analytics_day/analytics_hour locally.
      ...(data && { timeZone: data.branch.timeZone }),
    });

    if (fromQr && !qrVisitFired.current) {
      qrVisitFired.current = true;
      track("qr_visit");
    }

    scheduleAnalyticsLoad();
  }, [effectiveLocale, fromQr, host, locale, queryClient, trpc]);

  return null;
}
