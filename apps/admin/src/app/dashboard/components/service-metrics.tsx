import { OverviewPanel } from "@jmurga97/components";
import { useSuspenseQuery } from "@tanstack/react-query";

import * as api from "~/app/dashboard/api";
import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";
import { formatNumber, formatPercent } from "~/shared/services/format";

const TITLE = i18n.t("dashboard___Fidelización");
const LABELS = {
  visits: i18n.t("dashboard___Visitas con sello"),
  customers: i18n.t("dashboard___Clientes con sello"),
  cards: i18n.t("dashboard___Tarjetas con uso (30 d)"),
  repeat: i18n.t("dashboard___Tasa de repetición"),
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

/** One request, one period: every number comes from the 30-day snapshot. New vs returning lives in the chart. */
export function ServiceMetrics() {
  const { data: snapshot } = useSuspenseQuery(api.getAnalyticsSnapshotQueryOptions({ period: "30d", trpc }));
  const loyalty = snapshot.current.loyalty;
  return (
    <OverviewPanel
      title={TITLE}
      stats={[
        {
          id: "visits",
          label: LABELS.visits,
          value: formatNumber(loyalty.stampVisits),
          description: i18n.t("dashboard___Veces que un cliente sumó un sello en los últimos 30 días."),
        },
        {
          id: "customers",
          label: LABELS.customers,
          value: formatNumber(loyalty.visits),
          description: i18n.t("dashboard___Clientes distintos que sellaron en los últimos 30 días."),
        },
        {
          id: "cards",
          label: LABELS.cards,
          value: formatNumber(loyalty.cardsActiveLast30Days),
          description: i18n.t("dashboard___Clientes con al menos un sello en los últimos 30 días."),
        },
        {
          id: "repeat",
          label: LABELS.repeat,
          value: loyalty.repeatVisitRate === null ? "—" : formatPercent(loyalty.repeatVisitRate),
          description: i18n.t("dashboard___Porcentaje de clientes con dos o más visitas en el periodo."),
        },
      ]}
    />
  );
}
