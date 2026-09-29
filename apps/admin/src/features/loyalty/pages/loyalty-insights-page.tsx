import { Button, Checkbox, OverviewPanel, SearchField } from "@jmurga97/components";
import { ArrowDownIcon, ArrowUpIcon } from "@jmurga97/components/icon";
import { Suspense } from "react";

import { useLoyaltyInsightsController } from "~/features/loyalty/hooks/use-loyalty-insights-controller";
import { i18n } from "~/lib/i18n";
import { StackedBarChart } from "~/shared/components/charts/stacked-bar-chart";
import { VISIT_SERIES, toVisitChartPoints } from "~/shared/components/charts/visit-chart";
import { SegmentedToggle } from "~/shared/components/controls/segmented-toggle";
import { CardSkeleton } from "~/shared/components/state/loading-state";
import { formatDate, formatNumber, formatPercent } from "~/shared/services/format";

import type { CustomerSort } from "~/features/loyalty/types";

const COLUMNS: Array<{ key: CustomerSort; label: string }> = [
  { key: "email", label: i18n.t("loyalty___Email") },
  { key: "stampsBalance", label: i18n.t("loyalty___Sellos") },
  { key: "totalVisits", label: i18n.t("loyalty___Visitas") },
  { key: "firstVisitAt", label: i18n.t("loyalty___Primera visita") },
  { key: "lastVisitAt", label: i18n.t("loyalty___Última visita") },
  { key: "rewardsRedeemed", label: i18n.t("loyalty___Premios") },
];

export function LoyaltyInsightsPage() {
  return (
    <Suspense
      fallback={
        <>
          <CardSkeleton rows={2} title={i18n.t("loyalty___Indicadores de fidelización")} />
          <CardSkeleton rows={4} title={i18n.t("loyalty___Nuevos y recurrentes")} />
          <CardSkeleton rows={5} title={i18n.t("loyalty___Clientes")} />
        </>
      }
    >
      <LoyaltyInsightsContent />
    </Suspense>
  );
}

function LoyaltyInsightsContent() {
  const loyalty = useLoyaltyInsightsController();
  const { customers, search, summary } = loyalty;
  const refreshingClass = loyalty.refreshing ? " admin-refreshing" : "";
  return (
    <>
      <OverviewPanel
        title={i18n.t("loyalty___Indicadores de fidelización")}
        stats={[
          { id: "cards", label: i18n.t("loyalty___Tarjetas activas"), value: formatNumber(summary.activeCards) },
          { id: "stamps", label: i18n.t("loyalty___Sellos este mes"), value: formatNumber(summary.stampsThisMonth) },
          {
            id: "redemptions",
            label: i18n.t("loyalty___Canjes este mes"),
            value: formatNumber(summary.redemptionsThisMonth),
          },
          { id: "rate", label: i18n.t("loyalty___Tasa de canje"), value: formatPercent(summary.redemptionRate) },
          { id: "repeat", label: i18n.t("loyalty___Visita repetida"), value: formatPercent(summary.repeatVisitRate) },
        ]}
      />
      <div aria-busy={loyalty.refreshing || undefined} className={"loyalty-insights-grid"}>
        <section className={`admin-card loyalty-chart-card${refreshingClass}`}>
          <div className="admin-toolbar">
            <h2>{i18n.t("loyalty___Nuevos y recurrentes")}</h2>
            <SegmentedToggle
              ariaLabel={i18n.t("loyalty___Periodo del gráfico")}
              onChange={loyalty.setPeriod}
              options={[
                { label: i18n.t("loyalty___30 días"), value: "30d" },
                { label: i18n.t("loyalty___12 meses"), value: "12m" },
              ]}
              value={search.period}
            />
          </div>
          <StackedBarChart
            ariaLabel={i18n.t("loyalty___Visitas nuevas y recurrentes durante el periodo seleccionado")}
            emptyLabel={i18n.t("loyalty___Las primeras visitas aparecerán aquí.")}
            points={toVisitChartPoints(loyalty.visitsPoints)}
            series={VISIT_SERIES}
          />
          <p className={"loyalty-chart-summary"}>
            {formatNumber(loyalty.visitsTotals.newVisits)} {i18n.t("loyalty___primeras visitas ·")}{" "}
            {formatNumber(loyalty.visitsTotals.returningVisits)} {i18n.t("loyalty___visitas recurrentes")}
          </p>
        </section>
      </div>
      <section aria-busy={loyalty.refreshing || undefined} className={`admin-card loyalty-customers${refreshingClass}`}>
        <div className="admin-toolbar">
          <h2>
            {i18n.t("loyalty___Clientes (")}
            {customers.total})
          </h2>
          <Button disabled={loyalty.exporting} onClick={() => loyalty.exportCustomers()} variant={"secondary"}>
            {loyalty.exporting ? i18n.t("loyalty___Preparando CSV…") : i18n.t("loyalty___Exportar CSV")}
          </Button>
        </div>
        <div className={"loyalty-customer-filters"}>
          <SearchField
            aria-label={i18n.t("loyalty___Buscar por email")}
            clearLabel={i18n.t("loyalty___Limpiar búsqueda")}
            onValueChange={(value) => loyalty.setCustomerSearch(value)}
            placeholder={i18n.t("loyalty___cliente@ejemplo.com")}
            value={search.search}
          />
          <div className={"loyalty-inactive-filter"}>
            <Checkbox
              checked={search.inactive}
              label={i18n.t("loyalty___Sin visita en los últimos 30 días")}
              onCheckedChange={(checked) => loyalty.setInactive(checked)}
            />
          </div>
        </div>
        {customers.rows.length === 0 ? (
          <p className={"loyalty-empty-list"}>{i18n.t("loyalty___No hay clientes que coincidan con estos filtros.")}</p>
        ) : (
          <div className={"loyalty-table-scroll"}>
            <table className={"loyalty-customer-table"}>
              <thead>
                <tr>
                  {COLUMNS.map((column) => (
                    <th key={column.key} scope={"col"}>
                      <button onClick={() => loyalty.sortBy(column.key)} type={"button"}>
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
        <div className={"loyalty-pagination"}>
          <span>
            {i18n.t("loyalty___Página")} {search.page} {i18n.t("loyalty___de")} {loyalty.totalPages}
          </span>
          <div>
            <Button
              disabled={search.page <= 1}
              onClick={() => loyalty.setPage(search.page - 1)}
              type={"button"}
              variant={"secondary"}
            >
              {i18n.t("loyalty___Anterior")}
            </Button>
            <Button
              disabled={search.page >= loyalty.totalPages}
              onClick={() => loyalty.setPage(search.page + 1)}
              type={"button"}
              variant={"secondary"}
            >
              {i18n.t("loyalty___Siguiente")}
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function SortDirectionIcon({ direction }: { direction: "asc" | "desc" }) {
  const Arrow = direction === "asc" ? ArrowUpIcon : ArrowDownIcon;
  return <Arrow className={"loyalty-sort-icon"} />;
}
