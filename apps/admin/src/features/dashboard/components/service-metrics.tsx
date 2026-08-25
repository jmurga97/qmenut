import { useSuspenseQuery } from "@tanstack/react-query";

import * as api from "~/features/dashboard/api";
import { useVisitsPeriod } from "~/features/dashboard/hooks/use-visits-period";
import { trpc } from "~/lib/trpc";
import { MetricSummary } from "~/shared/components/metrics/metric-summary";
import { formatNumber, formatPercent } from "~/shared/services/format";
import { getVisitsRange, sumVisits } from "~/shared/services/visit-series";

const PERIOD_LABEL = { "12m": "últimos 12 meses", "30d": "últimos 30 días" } as const;

export function ServiceMetrics() {
  const { period } = useVisitsPeriod();
  const { data: summary } = useSuspenseQuery(api.getLoyaltySummaryQueryOptions({ trpc }));
  const range = getVisitsRange(period);
  const { data: visits } = useSuspenseQuery(api.getLoyaltyVisitsQueryOptions({ ...range, trpc }));
  const totals = sumVisits(visits);
  return (
    <MetricSummary
      description={PERIOD_LABEL[period]}
      focusLabel="Visitas registradas"
      focusValue={formatNumber(totals.newVisits + totals.returningVisits)}
      label="Estado del servicio"
      supporting={[
        { label: "Primeras visitas", value: formatNumber(totals.newVisits) },
        { label: "Visitas recurrentes", value: formatNumber(totals.returningVisits) },
        { label: "Tarjetas activas", value: formatNumber(summary.activeCards) },
        { label: "Visita repetida", value: formatPercent(summary.repeatVisitRate) },
      ]}
    />
  );
}
