import { OverviewPanel } from "@jmurga97/components";
import { useSuspenseQuery } from "@tanstack/react-query";

import * as api from "~/app/dashboard/api";
import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";
import { formatNumber, formatPercent } from "~/shared/services/format";
import { sumVisits } from "~/shared/services/visit-series";

const TITLE = i18n.t("dashboard___Fidelización");
const LABELS = {
  visits: i18n.t("dashboard___Visitas con sello"),
  new: i18n.t("dashboard___Clientes nuevos"),
  returning: i18n.t("dashboard___Clientes que repiten"),
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

export function ServiceMetrics() {
  const { data: snapshot } = useSuspenseQuery(api.getAnalyticsSnapshotQueryOptions({ period: "30d", trpc }));
  const from = Date.parse(`${snapshot.period.fromDay}T00:00:00Z`);
  const to = Date.parse(`${snapshot.period.toDay}T00:00:00Z`) + 86_400_000 - 1;
  const { data: visits } = useSuspenseQuery(api.getLoyaltyVisitsQueryOptions({ from, to, trpc }));
  const totals = sumVisits(visits);
  const loyalty = snapshot.current.loyalty;
  return (
    <OverviewPanel
      title={TITLE}
      stats={[
        {
          id: "visits",
          label: LABELS.visits,
          value: formatNumber(totals.newVisits + totals.returningVisits),
          description: i18n.t("dashboard___Veces que un cliente sumó un sello con el código del local."),
        },
        {
          id: "new",
          label: LABELS.new,
          value: formatNumber(totals.newVisits),
          description: i18n.t("dashboard___Clientes que sellaron por primera vez."),
        },
        {
          id: "returning",
          label: LABELS.returning,
          value: formatNumber(totals.returningVisits),
          description: i18n.t("dashboard___Sellos de clientes que ya habían venido."),
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
