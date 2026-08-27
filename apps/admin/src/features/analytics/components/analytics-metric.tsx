import { cn } from "@jmurga97/components";

import { formatAnalyticsTrend } from "~/features/analytics/services";

import type { AnalyticsTrend } from "~/features/analytics/services";

export function AnalyticsMetric({
  label,
  note,
  primary = false,
  trend,
  value,
}: {
  label: string;
  note?: string;
  primary?: boolean;
  trend?: AnalyticsTrend;
  value: string;
}) {
  const formattedTrend = formatAnalyticsTrend(trend);

  return (
    <article className={cn("admin-metric analytics-metric", primary && "admin-metric--primary")}>
      <span className="admin-metric-label">{label}</span>
      <strong className="admin-metric-value">{value}</strong>
      <span className={cn("analytics-metric-trend", `analytics-metric-trend--${formattedTrend.tone}`)}>
        {formattedTrend.label}
      </span>
      {note ? <span className="admin-metric-hint">{note}</span> : null}
    </article>
  );
}
