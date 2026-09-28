import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Suspense } from "react";

import * as api from "~/app/dashboard/api";
import { formatMultiplier } from "~/features/analytics/services";
import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";
import { Skeleton } from "~/shared/components/state/loading-state";
import { formatNumber, formatPercent } from "~/shared/services/format";

const LABELS = [
  i18n.t("dashboard___Cargas de carta"),
  i18n.t("dashboard___Tráfico QR"),
  i18n.t("dashboard___Aperturas / carga"),
  i18n.t("dashboard___Acciones de contacto"),
] as const;

/** Labels are static; values are skeletons until the snapshot arrives. */
function PulseMetrics({ values }: { values?: string[] }) {
  return (
    <dl aria-busy={values ? undefined : true} className="admin-dashboard-pulse-metrics">
      {LABELS.map((label, index) => (
        <div className="admin-dashboard-pulse-metric" key={label}>
          <dt>{label}</dt>
          <dd>{values?.[index] ?? <Skeleton height={"1.5rem"} width={"5rem"} />}</dd>
        </div>
      ))}
    </dl>
  );
}

function PulseMetricsData() {
  const { data: snapshot } = useSuspenseQuery(api.getAnalyticsSnapshotQueryOptions({ period: "15d", trpc }));
  const current = snapshot.current;
  return (
    <PulseMetrics
      values={[
        formatNumber(current.loads),
        formatPercent(current.qrLoadShare),
        formatMultiplier(current.menu.opensPerLoad),
        formatNumber(current.contactPwa.contactActionsTotal),
      ]}
    />
  );
}

export function AnalyticsPulseCard() {
  return (
    <section aria-labelledby="admin-dashboard-analytics-title" className={"admin-card admin-dashboard-analytics-pulse"}>
      <div className="admin-toolbar">
        <div>
          <h2 id="admin-dashboard-analytics-title">{i18n.t("dashboard___Carta pública")}</h2>
          <p className="admin-chart-summary">{i18n.t("dashboard___Últimos 15 días · todas las sucursales")}</p>
        </div>
        <Link className="admin-link" search={{ period: "15d" }} to={"/analytics"}>
          {i18n.t("dashboard___Ver analítica →")}
        </Link>
      </div>
      <Suspense fallback={<PulseMetrics />}>
        <PulseMetricsData />
      </Suspense>
    </section>
  );
}
