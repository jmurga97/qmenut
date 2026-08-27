import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { formatMultiplier } from "~/features/analytics/services";
import * as api from "~/features/dashboard/api";
import { trpc } from "~/lib/trpc";
import { formatNumber, formatPercent } from "~/shared/services/format";

function PulseMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-dashboard-pulse-metric">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function AnalyticsPulseCard() {
  const { data: snapshot } = useSuspenseQuery(api.getAnalyticsSnapshotQueryOptions({ period: "15d", trpc }));
  const current = snapshot.current;

  return (
    <section aria-labelledby="admin-dashboard-analytics-title" className="admin-card admin-dashboard-analytics-pulse">
      <div className="admin-toolbar">
        <div>
          <h3 id="admin-dashboard-analytics-title">Carta pública</h3>
          <p className="admin-chart-summary">Últimos 15 días · todas las sucursales</p>
        </div>
        <Link className="admin-link" search={{ period: "15d" }} to="/analytics">
          Ver analítica →
        </Link>
      </div>
      <dl className="admin-dashboard-pulse-metrics">
        <PulseMetric label="Cargas de carta" value={formatNumber(current.loads)} />
        <PulseMetric label="Tráfico QR" value={formatPercent(current.qrLoadShare)} />
        <PulseMetric label="Aperturas / carga" value={formatMultiplier(current.menu.opensPerLoad)} />
        <PulseMetric label="Acciones de contacto" value={formatNumber(current.contactPwa.contactActionsTotal)} />
      </dl>
    </section>
  );
}
