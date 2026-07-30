import { Link } from "@tanstack/react-router";

import { useLoyaltyInsightsController } from "~/features/loyalty/hooks/use-loyalty-insights-controller";
import * as services from "~/features/loyalty/services";
import { PageHeader } from "~/shared/components/page-header";
import { formatMoney } from "~/shared/services/money";

import type { CustomerSort, LoyaltyVisitsPoint } from "~/features/loyalty/types";

const COLUMNS: Array<{ key: CustomerSort; label: string }> = [
  { key: "email", label: "Email" },
  { key: "stampsBalance", label: "Sellos" },
  { key: "totalVisits", label: "Visitas" },
  { key: "firstVisitAt", label: "Primera visita" },
  { key: "lastVisitAt", label: "Última visita" },
  { key: "rewardsRedeemed", label: "Premios" },
];
const INDICATORS = { asc: " ↑", desc: " ↓" } as const;
export function LoyaltyInsightsPage() {
  const loyalty = useLoyaltyInsightsController();
  const { customers, loyaltyReturn, search, summary } = loyalty;
  return (
    <div className="admin-page admin-loyalty-page">
      <PageHeader kicker="Insights" title="La salud del programa" />
      <section aria-label="Indicadores de fidelización" className="loyalty-metric-grid">
        <Metric label="Tarjetas activas" value={services.formatNumber(summary.activeCards)} />
        <Metric label="Sellos este mes" value={services.formatNumber(summary.stampsThisMonth)} />
        <Metric label="Canjes este mes" value={services.formatNumber(summary.redemptionsThisMonth)} />
        <Metric label="Tasa de canje" value={services.formatPercent(summary.redemptionRate)} />
        <Metric label="Visita repetida" value={services.formatPercent(summary.repeatVisitRate)} />
      </section>
      <section className="admin-card loyalty-chart-card">
        <div className="admin-toolbar">
          <h3>Nuevos y recurrentes</h3>
          <div className="loyalty-segmented" aria-label="Periodo del gráfico">
            {(["30d", "12m"] as const).map((period) => (
              <button
                aria-pressed={search.period === period}
                key={period}
                onClick={() => loyalty.setPeriod(period)}
                type="button"
              >
                {period === "30d" ? "30 días" : "12 meses"}
              </button>
            ))}
          </div>
        </div>
        <VisitsChart points={loyalty.visitsPoints} />
        <p className="loyalty-chart-summary">
          {services.formatNumber(loyalty.visitsTotals.newVisits)} primeras visitas ·{" "}
          {services.formatNumber(loyalty.visitsTotals.returningVisits)} visitas recurrentes
        </p>
      </section>
      <section className="admin-card loyalty-return-card">
        <h3>Retorno estimado por premio</h3>
        {loyaltyReturn.ticketMedio === null ? (
          <div className="loyalty-return-empty">
            <p>Indica el ticket medio para calcular una estimación del retorno.</p>
            <Link className="admin-link" to="/loyalty/program">
              Configurar ticket medio →
            </Link>
          </div>
        ) : (
          <>
            <div className="loyalty-return-headline">
              <strong>{services.formatReturnRatio(loyalty.returnRatio)}</strong>
            </div>
            <div className="loyalty-return-totals">
              <Metric label="Ingresos estimados" value={formatMoney(loyalty.returnTotals.estimatedRevenue)} />
              <Metric label="Coste de premios" value={formatMoney(loyalty.returnTotals.rewardCost)} />
            </div>
          </>
        )}
      </section>
      <section className="admin-card loyalty-customers">
        <div className="admin-toolbar">
          <h3>Clientes ({customers.total})</h3>
          <mc-button disabled={loyalty.exporting} onClick={() => loyalty.exportCustomers()} variant="secondary">
            {loyalty.exporting ? "Preparando CSV…" : "Exportar CSV"}
          </mc-button>
        </div>
        <div className="loyalty-customer-filters">
          <label className="admin-field">
            <span>Buscar por email</span>
            <input
              defaultValue={search.search}
              key={search.search}
              onChange={(event) => loyalty.setCustomerSearch(event.currentTarget.value)}
              placeholder="cliente@ejemplo.com"
              type="search"
            />
          </label>
          <label className="admin-checkbox loyalty-inactive-filter">
            <input
              checked={search.inactive}
              onChange={(event) => loyalty.setInactive(event.currentTarget.checked)}
              type="checkbox"
            />
            Sin visita en los últimos 30 días
          </label>
        </div>
        {loyalty.exportError ? <mc-inline-message message="No se pudo exportar el CSV." tone="error" /> : null}
        {customers.rows.length === 0 ? (
          <p className="loyalty-empty-list">No hay clientes que coincidan con estos filtros.</p>
        ) : (
          <div className="loyalty-table-scroll">
            <table className="loyalty-customer-table">
              <thead>
                <tr>
                  {COLUMNS.map((column) => (
                    <th key={column.key} scope="col">
                      <button onClick={() => loyalty.sortBy(column.key)} type="button">
                        {column.label}
                        {search.sortBy === column.key ? INDICATORS[search.sortDir] : ""}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.rows.map((customer) => (
                  <tr key={customer.customerId}>
                    <td>{customer.email}</td>
                    <td>{services.formatNumber(customer.stampsBalance)}</td>
                    <td>{services.formatNumber(customer.totalVisits)}</td>
                    <td>{services.formatDate(customer.firstVisitAt)}</td>
                    <td>{services.formatDate(customer.lastVisitAt)}</td>
                    <td>{services.formatNumber(customer.rewardsRedeemed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="loyalty-pagination">
          <span>
            Página {search.page} de {loyalty.totalPages}
          </span>
          <div>
            <button disabled={search.page <= 1} onClick={() => loyalty.setPage(search.page - 1)} type="button">
              Anterior
            </button>
            <button
              disabled={search.page >= loyalty.totalPages}
              onClick={() => loyalty.setPage(search.page + 1)}
              type="button"
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="loyalty-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
function VisitsChart({ points }: { points: LoyaltyVisitsPoint[] }) {
  if (points.length === 0) return <div className="loyalty-chart-empty">Las primeras visitas aparecerán aquí.</div>;
  return (
    <ul className="admin-list" aria-label="Visitas nuevas y recurrentes durante el periodo seleccionado">
      {points.map((point) => (
        <li className="admin-list-item" key={point.day}>
          <strong>{point.day}</strong>
          <span className="admin-list-meta">
            {point.newVisits} nuevas · {point.returningVisits} recurrentes
          </span>
        </li>
      ))}
    </ul>
  );
}
