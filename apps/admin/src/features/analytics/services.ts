import { i18n } from "~/lib/i18n";
import { formatNumber, formatPercent } from "~/shared/services/format";

import type { AnalyticsSnapshot } from "./types";

export type AnalyticsTrend = NonNullable<AnalyticsSnapshot["comparison"]>["metrics"][string];

function formatDay(date: Date): string {
  return new Intl.DateTimeFormat(i18n.resolvedLanguage ?? "es", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

export function formatAnalyticsDateRange(snapshot: AnalyticsSnapshot): string {
  const from = formatDay(new Date(`${snapshot.period.fromDay}T00:00:00Z`)).replace(".", "");
  const to = formatDay(new Date(`${snapshot.period.toDay}T00:00:00Z`)).replace(".", "");
  return `${from} — ${to}`;
}

export function formatMultiplier(value: number | null): string {
  return value === null ? "—" : `${value.toLocaleString(i18n.resolvedLanguage ?? "es", { maximumFractionDigits: 2 })}×`;
}

export function formatNullablePercent(value: number | null): string {
  return value === null ? "—" : formatPercent(value);
}

export function formatDays(value: number | null): string {
  return value === null ? "—" : i18n.t("analytics___{{count}} días", { count: formatNumber(Math.round(value)) });
}

export function formatHours(value: number | null): string {
  return value === null ? "—" : i18n.t("analytics___{{count}} h", { count: formatNumber(Math.round(value)) });
}

export function formatAnalyticsTrend(trend: AnalyticsTrend | undefined): {
  label: string;
  tone: "negative" | "neutral" | "positive";
} {
  if (!trend) return { label: i18n.t("analytics___Sin comparación"), tone: "neutral" };

  if (trend.kind === "count") {
    if (trend.changeRatio === null) return { label: i18n.t("analytics___Sin base comparable"), tone: "neutral" };
    if (trend.changeRatio === 0) return { label: i18n.t("analytics___Sin cambio"), tone: "neutral" };
    return {
      label: `${trend.changeRatio > 0 ? "↑" : "↓"} ${formatPercent(Math.abs(trend.changeRatio))}`,
      tone: trend.changeRatio > 0 ? "positive" : "negative",
    };
  }

  if (trend.changePoints === null) return { label: i18n.t("analytics___Sin base comparable"), tone: "neutral" };
  if (trend.changePoints === 0) return { label: i18n.t("analytics___Sin cambio"), tone: "neutral" };
  return {
    label: `${trend.changePoints > 0 ? "↑" : "↓"} ${i18n.t("analytics___{{count}} p.p.", {
      count: Math.abs(trend.changePoints * 100).toLocaleString(i18n.resolvedLanguage ?? "es", {
        maximumFractionDigits: 1,
      }),
    })}`,
    tone: trend.changePoints > 0 ? "positive" : "negative",
  };
}

export function getAnalyticsTrend(snapshot: AnalyticsSnapshot, key: string): AnalyticsTrend | undefined {
  return snapshot.comparison?.metrics[key];
}
