import { aggregateWeekly, formatDayLabel } from "~/shared/services/visit-series";

import type { StackedBarSeries, StackedBarPoint } from "./stacked-bar-chart";
import type { VisitsPeriod, VisitSeriesPoint } from "~/shared/services/visit-series";

export const VISIT_SERIES: ReadonlyArray<StackedBarSeries> = [
  { key: "newVisits", label: "primeras visitas", tone: "service" },
  { key: "returningVisits", label: "recurrentes", tone: "ink" },
];

export function resolveVisitPoints(period: VisitsPeriod, points: VisitSeriesPoint[]): VisitSeriesPoint[] {
  return period === "12m" ? aggregateWeekly(points) : points;
}

export function toVisitChartPoints(points: VisitSeriesPoint[]): StackedBarPoint[] {
  return points.map((point) => ({
    id: point.day,
    label: formatDayLabel(point.day),
    values: { newVisits: point.newVisits, returningVisits: point.returningVisits },
  }));
}
