import { Button } from "@jmurga97/components";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Suspense } from "react";

import { ExchangeRatesCard } from "~/features/exchange-rates/components/exchange-rates-card";
import { VenueCodeCard } from "~/features/loyalty/components/venue-code-card";
import { FEATURES } from "~/lib/features";
import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";
import { getTenantQueryOptions } from "~/shared/api";
import { PageHeader } from "~/shared/components/page-header";
import { CardSkeleton } from "~/shared/components/state/loading-state";
import { useCan } from "~/shared/hooks/use-can";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";
import { buildPublicMenuUrl } from "~/shared/services/public-menu-url";

import { AnalyticsPulseCard } from "../components/analytics-pulse-card";
import { AvailabilityCard } from "../components/availability-card";
import { PendingRedemptionsCard } from "../components/pending-redemptions-card";
import { PromotionsCard } from "../components/promotions-card";
import { ServiceMetrics, ServiceMetricsSkeleton } from "../components/service-metrics";
import { VisitsChartCard } from "../components/visits-chart-card";

/** Daily controls first (availability, venue code, redemptions, promotions, rates); analytics sits behind a flag. */
export function DashboardPage() {
  const { data: tenant } = useSuspenseQuery(getTenantQueryOptions({ trpc }));
  const branch = useSelectedBranch();
  const canInsights = useCan("analytics.read") && FEATURES.analytics;
  const canOperate = useCan("loyalty.operate");
  const canToggleAvailability = useCan("menu.toggleDishAvailability");
  const canExchangeRates = useCan("exchangeRates.write") && tenant.restaurant.sourceCurrency === "USD";
  return (
    <div className={"ming-page admin-page admin-dashboard"}>
      <PageHeader
        actions={
          <>
            {branch?.customDomain ? (
              <Button
                nativeButton={false}
                render={<a href={buildPublicMenuUrl(branch.customDomain)} rel={"noreferrer"} target={"_blank"} />}
                variant={"secondary"}
              >
                {i18n.t("dashboard___Ver carta ↗")}
              </Button>
            ) : null}
            <Button nativeButton={false} render={<Link to={"/qr"} />} variant={"secondary"}>
              {i18n.t("dashboard___Código QR")}
            </Button>
          </>
        }
        description={branch ? (branch.customDomain ?? i18n.t("dashboard___Sin dominio público todavía.")) : undefined}
        kicker={
          branch
            ? i18n.t("dashboard___Panel diario · {{branch}}", { branch: branch.name })
            : i18n.t("dashboard___Panel diario")
        }
        title={i18n.t("dashboard___Resumen")}
      />
      {canToggleAvailability || canOperate ? (
        <div className="admin-dashboard-split">
          {canToggleAvailability ? (
            <Suspense fallback={<CardSkeleton rows={5} title={i18n.t("dashboard___Disponibilidad de la carta")} />}>
              <AvailabilityCard />
            </Suspense>
          ) : null}
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
      <div className="admin-dashboard-split">
        <Suspense fallback={<CardSkeleton rows={3} title={i18n.t("dashboard___Promociones")} />}>
          <PromotionsCard />
        </Suspense>
        {canExchangeRates ? (
          <Suspense fallback={<CardSkeleton rows={2} title={i18n.t("dashboard___Tasa VES")} />}>
            <ExchangeRatesCard />
          </Suspense>
        ) : null}
      </div>
      {canInsights ? (
        <>
          <Suspense fallback={<ServiceMetricsSkeleton />}>
            <ServiceMetrics />
          </Suspense>
          <AnalyticsPulseCard />
          <VisitsChartCard />
        </>
      ) : null}
    </div>
  );
}
