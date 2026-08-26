import { useSuspenseQuery } from "@tanstack/react-query";
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
  const { host } = useTenantContext();
  const { effectiveLocale, locale } = useRouteContext({ from: "/{-$locale}" });
  const { utm_source: utmSource } = useSearch({ from: "/{-$locale}" });
  const qrVisitFired = useRef(false);
  const { data } = useSuspenseQuery(getPublicMenuQueryOptions({ host, locale, trpc }));

  useEffect(() => {
    if (!data) {
      return;
    }

    registerTenantProperties({
      tenantHost: host,
      // Splits installed-app sessions from browser sessions on every event, which is the
      // number that shows a restaurant what the PWA is actually worth.
      displayMode: window.matchMedia("(display-mode: standalone)").matches ? "standalone" : "browser",
      // Effective language of the visit, not the URL prefix the visitor happened to type.
      locale: effectiveLocale,
      restaurantId: data.branch.restaurantId,
      branchId: data.branch.id,
      // Public dimension used only to compute analytics_day/analytics_hour locally.
      timeZone: data.branch.timeZone,
    });

    if (utmSource === "qr" && !qrVisitFired.current) {
      qrVisitFired.current = true;
      track("qr_visit");
    }

    scheduleAnalyticsLoad();
  }, [data, effectiveLocale, utmSource, host]);

  return null;
}
