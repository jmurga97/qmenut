import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";

import { ExchangeRatesCard } from "~/features/exchange-rates/components/exchange-rates-card";
import { VenueCodeCard } from "~/features/loyalty/components/venue-code-card";
import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";
import { getTenantQueryOptions } from "~/shared/api";
import { PageHeader } from "~/shared/components/page-header";
import { CardSkeleton } from "~/shared/components/state/loading-state";
import { useCan } from "~/shared/hooks/use-can";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

import { AnalyticsPulseCard } from "../components/analytics-pulse-card";
import { AvailabilityCard } from "../components/availability-card";
import { PendingRedemptionsCard } from "../components/pending-redemptions-card";
import { ServiceMetrics, ServiceMetricsSkeleton } from "../components/service-metrics";
import { VisitsChartCard } from "../components/visits-chart-card";

/** Header, layout and card chrome render at once; each data card suspends on its own query. */
export function DashboardPage() {
  const { data: tenant } = useSuspenseQuery(getTenantQueryOptions({ trpc }));
  const branch = useSelectedBranch();
  const canInsights = useCan("analytics.read");
  const canOperate = useCan("loyalty.operate");
  const canToggleAvailability = useCan("menu.toggleDishAvailability");
  const canExchangeRates = useCan("exchangeRates.write");
  return (
    <div className={"ming-page admin-page admin-dashboard"}>
      <PageHeader
        description={branch ? (branch.customDomain ?? i18n.t("dashboard___Sin dominio público todavía.")) : undefined}
        kicker={
          branch
            ? i18n.t("dashboard___Panel diario · {{branch}}", { branch: branch.name })
            : i18n.t("dashboard___Panel diario")
        }
        title={i18n.t("dashboard___Resumen")}
      />
      {canInsights ? (
        <Suspense fallback={<ServiceMetricsSkeleton />}>
          <ServiceMetrics />
        </Suspense>
      ) : null}
      {canInsights ? <AnalyticsPulseCard /> : null}
      {canExchangeRates && tenant.restaurant.sourceCurrency === "USD" ? (
        <Suspense fallback={<CardSkeleton rows={2} title={i18n.t("dashboard___Tasa VES")} />}>
          <ExchangeRatesCard />
        </Suspense>
      ) : null}
      {canInsights || canOperate ? (
        <div className="admin-dashboard-bottom">
          {canInsights ? <VisitsChartCard /> : null}
          {canOperate && branch ? (
            <div className="admin-dashboard-ops">
              <VenueCodeCard
                branchId={branch.id}
                compact
                description={i18n.t("dashboard___Cambia solo. Compártelo para que tus clientes sumen sellos.")}
                heading={i18n.t("dashboard___Código de la sucursal")}
              />
              <PendingRedemptionsCard />
            </div>
          ) : null}
        </div>
      ) : null}
      {canToggleAvailability ? (
        <Suspense fallback={<CardSkeleton rows={5} title={i18n.t("dashboard___Disponibilidad de la carta")} />}>
          <AvailabilityCard />
        </Suspense>
      ) : null}
    </div>
  );
}
