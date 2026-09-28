import { OverviewPanel } from "@jmurga97/components";
import { useSuspenseQuery } from "@tanstack/react-query";

import * as api from "~/app/dashboard/api";
import { useVisitsPeriod } from "~/app/dashboard/hooks/use-visits-period";
import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";
import { formatNumber, formatPercent } from "~/shared/services/format";
import { getVisitsRange, sumVisits } from "~/shared/services/visit-series";

const TITLE = i18n.t("dashboard___Estado del servicio");
const PERIOD_LABEL = {
  "12m": i18n.t("dashboard___últimos 12 meses"),
  "30d": i18n.t("dashboard___últimos 30 días"),
} as const;
const LABELS = {
  visits: i18n.t("dashboard___Visitas registradas"),
  new: i18n.t("dashboard___Primeras visitas"),
  returning: i18n.t("dashboard___Visitas recurrentes"),
  cards: i18n.t("dashboard___Tarjetas activas"),
  repeat: i18n.t("dashboard___Visita repetida"),
} as const;

export function ServiceMetricsSkeleton() {
  return (
    <OverviewPanel
      className="admin-overview-skeleton"
      loading
      stats={Object.entries(LABELS).map(([id, label]) => ({ id, label, value: "" }))}
      title={TITLE}
    />
  );
}

export function ServiceMetrics() {
  const { period, refreshing } = useVisitsPeriod();
  const { data: summary } = useSuspenseQuery(api.getLoyaltySummaryQueryOptions({ trpc }));
  const { data: visits } = useSuspenseQuery(api.getLoyaltyVisitsQueryOptions({ ...getVisitsRange(period), trpc }));
  const totals = sumVisits(visits);
  return (
    <OverviewPanel
      className={refreshing ? "admin-refreshing" : undefined}
      title={TITLE}
      stats={[
        {
          id: "visits",
          label: LABELS.visits,
          value: formatNumber(totals.newVisits + totals.returningVisits),
          description: PERIOD_LABEL[period],
        },
        { id: "new", label: LABELS.new, value: formatNumber(totals.newVisits) },
        { id: "returning", label: LABELS.returning, value: formatNumber(totals.returningVisits) },
        { id: "cards", label: LABELS.cards, value: formatNumber(summary.activeCards) },
        { id: "repeat", label: LABELS.repeat, value: formatPercent(summary.repeatVisitRate) },
      ]}
    />
  );
}
