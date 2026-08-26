import { Button, Checkbox, InlineMessage, SearchField } from "@jmurga97/components";
import { Link } from "@tanstack/react-router";

import { useLoyaltyInsightsController } from "~/features/loyalty/hooks/use-loyalty-insights-controller";
import * as services from "~/features/loyalty/services";
import { StackedBarChart } from "~/shared/components/charts/stacked-bar-chart";
import { VISIT_SERIES, toVisitChartPoints } from "~/shared/components/charts/visit-chart";
import { SegmentedToggle } from "~/shared/components/controls/segmented-toggle";
import { Metric } from "~/shared/components/metrics/metric";
import { MetricSummary } from "~/shared/components/metrics/metric-summary";
import { PageHeader } from "~/shared/components/page-header";
import { formatDate, formatNumber, formatPercent } from "~/shared/services/format";
import { formatMoney } from "~/shared/services/money";

import type { CustomerSort } from "~/features/loyalty/types";

const COLUMNS: Array<{ key: CustomerSort; label: string }> = [
  { key: "email", label: "Email" },
  { key: "stampsBalance", label: "Sellos" },
  { key: "totalVisits", label: "Visitas" },
  { key: "firstVisitAt", label: "Primera visita" },
  { key: "lastVisitAt", label: "Última visita" },
  { key: "rewardsRedeemed", label: "Premios" },
];

export function LoyaltyInsightsPage() {
  const loyalty = useLoyaltyInsightsController();
  const { customers, loyaltyReturn, search, summary } = loyalty;
  return (
    <div className="admin-page admin-loyalty-page">
      <PageHeader kicker="Insights" title="La salud del programa" />
      <MetricSummary
        focusLabel="Tarjetas activas"
        focusValue={formatNumber(summary.activeCards)}
        label="Indicadores de fidelización"
        supporting={[
          { label: "Sellos este mes", value: formatNumber(summary.stampsThisMonth) },
          { label: "Canjes este mes", value: formatNumber(summary.redemptionsThisMonth) },
          { label: "Tasa de canje", value: formatPercent(summary.redemptionRate) },
          { label: "Visita repetida", value: formatPercent(summary.repeatVisitRate) },
        ]}
      />
      <div className="loyalty-insights-grid">
        <section className="admin-card loyalty-chart-card">
          <div className="admin-toolbar">
            <h3>Nuevos y recurrentes</h3>
            <SegmentedToggle
              ariaLabel="Periodo del gráfico"
              onChange={loyalty.setPeriod}
              options={[
                { label: "30 días", value: "30d" },
                { label: "12 meses", value: "12m" },
              ]}
              value={search.period}
            />
          </div>
          <StackedBarChart
            ariaLabel="Visitas nuevas y recurrentes durante el periodo seleccionado"
            emptyLabel="Las primeras visitas aparecerán aquí."
            points={toVisitChartPoints(loyalty.visitsPoints)}
            series={VISIT_SERIES}
          />
          <p className="loyalty-chart-summary">
            {formatNumber(loyalty.visitsTotals.newVisits)} primeras visitas ·{" "}
            {formatNumber(loyalty.visitsTotals.returningVisits)} visitas recurrentes
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
      </div>
      <section className="admin-card loyalty-customers">
        <div className="admin-toolbar">
          <h3>Clientes ({customers.total})</h3>
          <Button disabled={loyalty.exporting} onClick={() => loyalty.exportCustomers()} variant="secondary">
            {loyalty.exporting ? "Preparando CSV…" : "Exportar CSV"}
          </Button>
        </div>
        <div className="loyalty-customer-filters">
          <SearchField
            aria-label="Buscar por email"
            clearLabel="Limpiar búsqueda"
            onValueChange={(value) => loyalty.setCustomerSearch(value)}
            placeholder="cliente@ejemplo.com"
            value={search.search}
          />
          <div className="loyalty-inactive-filter">
            <Checkbox
              checked={search.inactive}
              label="Sin visita en los últimos 30 días"
              onCheckedChange={(checked) => loyalty.setInactive(checked)}
            />
          </div>
        </div>
        {loyalty.exportError ? <InlineMessage message="No se pudo exportar el CSV." tone="error" /> : null}
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
                        {search.sortBy === column.key ? <SortDirectionIcon direction={search.sortDir} /> : null}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.rows.map((customer) => (
                  <tr key={customer.customerId}>
                    <td>{customer.email}</td>
                    <td>{formatNumber(customer.stampsBalance)}</td>
                    <td>{formatNumber(customer.totalVisits)}</td>
                    <td>{formatDate(customer.firstVisitAt)}</td>
                    <td>{formatDate(customer.lastVisitAt)}</td>
                    <td>{formatNumber(customer.rewardsRedeemed)}</td>
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

function SortDirectionIcon({ direction }: { direction: "asc" | "desc" }) {
  return (
    <svg aria-hidden="true" className="loyalty-sort-icon" fill="none" viewBox="0 0 16 16">
      <path
        d={direction === "asc" ? "m4.5 9 3.5-3.5L11.5 9M8 5.5v6" : "m4.5 7 3.5 3.5L11.5 7M8 4.5v6"}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}
