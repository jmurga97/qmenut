import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";

import * as api from "~/app/dashboard/api";
import { useVisitsPeriod } from "~/app/dashboard/hooks/use-visits-period";
import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";
import { StackedBarChart } from "~/shared/components/charts/stacked-bar-chart";
import { VISIT_SERIES, resolveVisitPoints, toVisitChartPoints } from "~/shared/components/charts/visit-chart";
import { SegmentedToggle } from "~/shared/components/controls/segmented-toggle";
import { Skeleton } from "~/shared/components/state/loading-state";
import { formatNumber } from "~/shared/services/format";
import { getVisitsRange, sumVisits } from "~/shared/services/visit-series";

import type { DashboardSearch } from "~/app/dashboard/types";

export function VisitsChartCard() {
  const { period, refreshing, selectedPeriod, setPeriod } = useVisitsPeriod();
  return (
    <section className={"admin-card admin-visits-card"}>
      <div className="admin-toolbar">
        <h2>{i18n.t("dashboard___Visitas")}</h2>
        <SegmentedToggle
          ariaLabel={i18n.t("dashboard___Periodo de visitas")}
          onChange={(value) => void setPeriod(value)}
          options={[
            { label: i18n.t("dashboard___30 días"), value: "30d" },
            { label: i18n.t("dashboard___12 meses"), value: "12m" },
          ]}
          value={selectedPeriod}
        />
      </div>
      <Suspense fallback={<VisitsChartSkeleton />}>
        <VisitsChart period={period} refreshing={refreshing} />
      </Suspense>
    </section>
  );
}

function VisitsChart({ period, refreshing }: { period: DashboardSearch["period"]; refreshing: boolean }) {
  const { data: visits } = useSuspenseQuery(api.getLoyaltyVisitsQueryOptions({ ...getVisitsRange(period), trpc }));
  const points = resolveVisitPoints(period, visits);
  const totals = sumVisits(points);
  return (
    <div
      aria-busy={refreshing || undefined}
      className={refreshing ? "admin-data-region admin-refreshing" : "admin-data-region"}
    >
      <StackedBarChart
        ariaLabel={i18n.t("dashboard___Visitas nuevas y recurrentes durante el periodo seleccionado")}
        emptyLabel={i18n.t("dashboard___Cuando tus clientes registren su primera visita, la tendencia aparecerá aquí.")}
        points={toVisitChartPoints(points)}
        series={VISIT_SERIES}
      />
      <p className="admin-chart-summary">
        {formatNumber(totals.newVisits)} {i18n.t("dashboard___primeras visitas ·")}{" "}
        {formatNumber(totals.returningVisits)} {i18n.t("dashboard___recurrentes")}
      </p>
    </div>
  );
}

export function VisitsChartSkeleton() {
  return (
    <div aria-busy={"true"} aria-label={i18n.t("dashboard___Cargando visitas")} className="admin-data-region">
      <Skeleton height={"12rem"} />
      <Skeleton width={"16rem"} />
    </div>
  );
}
