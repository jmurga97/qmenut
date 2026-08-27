import { formatNumber, formatPercent } from "~/shared/services/format";

import type { AnalyticsSnapshot } from "./types";

export type AnalyticsTrend = NonNullable<AnalyticsSnapshot["comparison"]>["metrics"][string];

const DAY_FORMATTER = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export function formatAnalyticsDateRange(snapshot: AnalyticsSnapshot): string {
  const from = DAY_FORMATTER.format(new Date(`${snapshot.period.fromDay}T00:00:00Z`)).replace(".", "");
  const to = DAY_FORMATTER.format(new Date(`${snapshot.period.toDay}T00:00:00Z`)).replace(".", "");
  return `${from} — ${to}`;
}

export function formatMultiplier(value: number | null): string {
  return value === null ? "—" : `${value.toLocaleString("es-ES", { maximumFractionDigits: 2 })}×`;
}

export function formatNullablePercent(value: number | null): string {
  return value === null ? "—" : formatPercent(value);
}

export function formatDays(value: number | null): string {
  return value === null ? "—" : `${formatNumber(Math.round(value))} días`;
}

export function formatHours(value: number | null): string {
  return value === null ? "—" : `${formatNumber(Math.round(value))} h`;
}

export function formatAnalyticsTrend(trend: AnalyticsTrend | undefined): {
  label: string;
  tone: "negative" | "neutral" | "positive";
} {
  if (!trend) return { label: "Sin comparación", tone: "neutral" };

  if (trend.kind === "count") {
    if (trend.changeRatio === null) return { label: "Sin base comparable", tone: "neutral" };
    if (trend.changeRatio === 0) return { label: "Sin cambio", tone: "neutral" };
    return {
      label: `${trend.changeRatio > 0 ? "↑" : "↓"} ${formatPercent(Math.abs(trend.changeRatio))}`,
      tone: trend.changeRatio > 0 ? "positive" : "negative",
    };
  }

  if (trend.changePoints === null) return { label: "Sin base comparable", tone: "neutral" };
  if (trend.changePoints === 0) return { label: "Sin cambio", tone: "neutral" };
  return {
    label: `${trend.changePoints > 0 ? "↑" : "↓"} ${Math.abs(trend.changePoints * 100).toLocaleString("es-ES", {
      maximumFractionDigits: 1,
    })} p.p.`,
    tone: trend.changePoints > 0 ? "positive" : "negative",
  };
}

export function getAnalyticsTrend(snapshot: AnalyticsSnapshot, key: string): AnalyticsTrend | undefined {
  return snapshot.comparison?.metrics[key];
}
