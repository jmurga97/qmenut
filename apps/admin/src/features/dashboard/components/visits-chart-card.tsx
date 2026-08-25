import { useSuspenseQuery } from "@tanstack/react-query";

import * as api from "~/features/dashboard/api";
import { useVisitsPeriod } from "~/features/dashboard/hooks/use-visits-period";
import { trpc } from "~/lib/trpc";
import { StackedBarChart } from "~/shared/components/charts/stacked-bar-chart";
import { SegmentedToggle } from "~/shared/components/controls/segmented-toggle";
import { formatNumber } from "~/shared/services/format";
import { aggregateWeekly, formatDayLabel, getVisitsRange, sumVisits } from "~/shared/services/visit-series";

import type { StackedBarSeries, StackedBarPoint } from "~/shared/components/charts/stacked-bar-chart";

const VISIT_SERIES: ReadonlyArray<StackedBarSeries> = [
  { key: "newVisits", label: "primeras visitas", tone: "service" },
  { key: "returningVisits", label: "recurrentes", tone: "ink" },
];

export function VisitsChartCard() {
  const { period, setPeriod } = useVisitsPeriod();
  const range = getVisitsRange(period);
  const { data: visits } = useSuspenseQuery(api.getLoyaltyVisitsQueryOptions({ ...range, trpc }));
  const points = period === "12m" ? aggregateWeekly(visits) : visits;
  const totals = sumVisits(points);
  const chartPoints: StackedBarPoint[] = points.map((point) => ({
    id: point.day,
    label: formatDayLabel(point.day),
    values: { newVisits: point.newVisits, returningVisits: point.returningVisits },
  }));
  return (
    <section className="admin-card admin-visits-card">
      <div className="admin-toolbar">
        <h3>Visitas</h3>
        <SegmentedToggle
          ariaLabel="Periodo de visitas"
          onChange={(value) => void setPeriod(value)}
          options={[
            { label: "30 días", value: "30d" },
            { label: "12 meses", value: "12m" },
          ]}
          value={period}
        />
      </div>
      <StackedBarChart
        ariaLabel="Visitas nuevas y recurrentes durante el periodo seleccionado"
        emptyLabel="Cuando tus clientes registren su primera visita, la tendencia aparecerá aquí."
        points={chartPoints}
        series={VISIT_SERIES}
      />
      <p className="admin-chart-summary">
        {formatNumber(totals.newVisits)} primeras visitas · {formatNumber(totals.returningVisits)} recurrentes
      </p>
    </section>
  );
}
