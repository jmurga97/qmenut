import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { AnalyticsBarList } from "~/features/analytics/components/analytics-bar-list";
import { AnalyticsMetric } from "~/features/analytics/components/analytics-metric";
import { useAnalyticsController } from "~/features/analytics/hooks/use-analytics-controller";
import {
  formatAnalyticsDateRange,
  formatDays,
  formatHours,
  formatMultiplier,
  formatNullablePercent,
  getAnalyticsTrend,
} from "~/features/analytics/services";
import { ANALYTICS_PERIOD_OPTIONS } from "~/features/analytics/types";
import { trpc } from "~/lib/trpc";
import { getTenantQueryOptions } from "~/shared/api";
import { SegmentedToggle } from "~/shared/components/controls/segmented-toggle";
import { PageHeader } from "~/shared/components/page-header";
import { formatNumber, formatPercent } from "~/shared/services/format";
import { formatMoney } from "~/shared/services/money";

import type { AnalyticsSnapshot } from "../types";

const CONTACT_CHANNELS = [
  { key: "map", label: "Mapa" },
  { key: "phone", label: "Teléfono" },
  { key: "social", label: "Redes sociales" },
  { key: "whatsapp", label: "WhatsApp" },
] as const;

function formatLanguage(code: string): string {
  return code === "all" ? "Todos" : code.toUpperCase();
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function DetailStat({ label, note, value }: { label: string; note?: string; value: string }) {
  return (
    <div className="analytics-detail-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </div>
  );
}

function InlineStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="analytics-inline-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AnalyticsInsightsContent({ snapshot }: { snapshot: AnalyticsSnapshot }) {
  if (snapshot.insufficientData) {
    return (
      <p className="analytics-state-copy">
        Aún no hay suficientes cargas en ambos periodos para extraer comparaciones fiables. Necesitamos al menos 20
        cargas por periodo.
      </p>
    );
  }

  if (snapshot.insights.length === 0) {
    return <p className="analytics-state-copy">No hay cambios destacados que señalar en este periodo.</p>;
  }

  return (
    <ul className="analytics-insight-list">
      {snapshot.insights.map((insight) => (
        <li key={insight.code}>
          <span className={`analytics-insight-tone analytics-insight-tone--${insight.tone}`}>
            {insight.tone === "improvement" ? "Mejora" : "Oportunidad"}
          </span>
          <p>{insight.messageEs}</p>
        </li>
      ))}
    </ul>
  );
}

export function AnalyticsPage() {
  const { data: tenant } = useSuspenseQuery(getTenantQueryOptions({ trpc }));
  const { search, setPeriod, snapshot } = useAnalyticsController();
  const current = snapshot.current;
  const comparison = snapshot.comparison;
  const rangeLabel = formatAnalyticsDateRange(snapshot);

  return (
    <div className="admin-page analytics-page">
      <PageHeader
        description={`Datos del ${rangeLabel} · agregados para todas las sucursales.`}
        kicker="Analítica"
        title="Qué está pasando en tu carta"
      />

      <div className="admin-toolbar analytics-period-toolbar">
        <div className="analytics-period-copy">
          <span className="admin-kicker">Comparación</span>
          <strong>{snapshot.comparisonPeriod ? "Frente al periodo anterior" : "Sin periodo anterior"}</strong>
        </div>
        <SegmentedToggle
          ariaLabel="Periodo de analítica"
          onChange={(value) => void setPeriod(value)}
          options={ANALYTICS_PERIOD_OPTIONS}
          value={search.period}
        />
      </div>

      <section aria-label="Resumen de analítica" className="admin-metric-summary analytics-metric-summary">
        <AnalyticsMetric
          label="Cargas de carta"
          note="Páginas cargadas, todas las sucursales"
          primary
          trend={comparison ? getAnalyticsTrend(snapshot, "loads") : undefined}
          value={formatNumber(current.loads)}
        />
        <div className="admin-metric-supporting">
          <AnalyticsMetric
            label="Visitas efímeras"
            note="No son clientes únicos"
            trend={comparison ? getAnalyticsTrend(snapshot, "ephemeral_visits") : undefined}
            value={formatNumber(current.ephemeralVisits)}
          />
          <AnalyticsMetric
            label="Aperturas / carga"
            note="Puede superar 1×"
            trend={comparison ? getAnalyticsTrend(snapshot, "dish_opens_per_load") : undefined}
            value={formatMultiplier(current.menu.opensPerLoad)}
          />
          <AnalyticsMetric
            label="Tráfico QR"
            note="Cargas atribuidas al enlace QR"
            trend={comparison ? getAnalyticsTrend(snapshot, "qr_load_share") : undefined}
            value={formatPercent(current.qrLoadShare)}
          />
          <AnalyticsMetric
            label="Acciones de contacto"
            note="Toques registrados"
            trend={comparison ? getAnalyticsTrend(snapshot, "contact_actions") : undefined}
            value={formatNumber(current.contactPwa.contactActionsTotal)}
          />
        </div>
      </section>

      <section aria-labelledby="analytics-insights-title" className="admin-card analytics-panel analytics-insights">
        <div className="admin-toolbar">
          <div>
            <h3 id="analytics-insights-title">Lecturas</h3>
            <p className="analytics-panel-description">Señales para decidir qué revisar a continuación.</p>
          </div>
          <span className="analytics-period-label">{rangeLabel}</span>
        </div>
        <AnalyticsInsightsContent snapshot={snapshot} />
      </section>

      <div className="analytics-grid">
        <section aria-labelledby="analytics-traffic-title" className="admin-card analytics-panel">
          <div className="admin-toolbar">
            <div>
              <h3 id="analytics-traffic-title">Tráfico</h3>
              <p className="analytics-panel-description">Cómo llega la gente y cuándo abre la carta.</p>
            </div>
            <span className="analytics-panel-context">Todas las sucursales</span>
          </div>
          <div className="analytics-detail-grid">
            <DetailStat label="Carta instalada" note="Uso en modo PWA" value={formatPercent(current.standaloneShare)} />
            <DetailStat
              label="Visitas efímeras"
              note="Sumadas por bloque analítico"
              value={formatNumber(current.ephemeralVisits)}
            />
          </div>
          <div className="analytics-subsection">
            <h4>Idiomas</h4>
            <AnalyticsBarList
              items={current.languages.map((language) => ({
                id: language.code,
                label: formatLanguage(language.code),
                value: language.loads,
              }))}
            />
          </div>
          <div className="analytics-subsection">
            <h4>Sucursales</h4>
            <AnalyticsBarList
              items={current.branches.map((branch) => ({
                id: branch.branchId,
                label: branch.name ?? "Sucursal sin nombre",
                value: branch.loads,
              }))}
            />
          </div>
          <div className="analytics-subsection">
            <h4>Horas punta</h4>
            {current.peakHours.length === 0 ? (
              <p className="analytics-empty-detail">No hay horas punta disponibles todavía.</p>
            ) : (
              <ul className="analytics-chip-list">
                {current.peakHours.map((peak) => (
                  <li key={peak.hour}>
                    <strong>{formatHour(peak.hour)}</strong>
                    <span>{formatNumber(peak.loads)} cargas</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section aria-labelledby="analytics-menu-title" className="admin-card analytics-panel">
          <div className="admin-toolbar">
            <div>
              <h3 id="analytics-menu-title">Menú</h3>
              <p className="analytics-panel-description">Qué contenido despierta más interés.</p>
            </div>
            <span className="analytics-panel-context">Aperturas registradas</span>
          </div>
          <div className="analytics-detail-grid analytics-detail-grid--four">
            <DetailStat label="Aperturas de platos" value={formatNumber(current.menu.dishOpensTotal)} />
            <DetailStat label="Aperturas / carga" value={formatMultiplier(current.menu.opensPerLoad)} />
            <DetailStat label="Desde destacados" value={formatNumber(current.menu.featuredOpens)} />
            <DetailStat label="Desde secciones" value={formatNumber(current.menu.sectionOpens)} />
          </div>
          <div className="analytics-subsection">
            <h4>Platos más abiertos</h4>
            <AnalyticsBarList
              emptyLabel="Las aperturas de platos aparecerán aquí."
              items={current.menu.topDishes.slice(0, 5).map((dish) => ({
                id: dish.dishId,
                label: dish.name,
                meta: `${formatMultiplier(dish.openRatePerLoad)} por carga`,
                value: dish.opens,
              }))}
            />
          </div>
          <div className="analytics-subsection">
            <h4>Categorías</h4>
            <div className="analytics-inline-stats">
              <InlineStat label="Categorías alcanzadas" value={formatNumber(current.menu.categoriesReached)} />
              <InlineStat label="Selecciones" value={formatNumber(current.menu.categoriesSelected)} />
              <InlineStat
                label="Mayor profundidad"
                value={current.menu.maxDepthPosition === null ? "—" : formatNumber(current.menu.maxDepthPosition)}
              />
            </div>
          </div>
          <div className="analytics-subsection">
            <h4>Promociones</h4>
            <p className="analytics-subsection-summary">
              {formatNumber(current.menu.promotionOpensTotal)} aperturas en total
            </p>
            <AnalyticsBarList
              emptyLabel="Las aperturas de promociones aparecerán aquí."
              items={current.menu.topPromotions.slice(0, 3).map((promotion) => ({
                id: promotion.promotionId,
                label: promotion.promotionName ?? "Promoción sin nombre",
                value: promotion.openCount,
              }))}
            />
          </div>
        </section>

        <section aria-labelledby="analytics-contact-title" className="admin-card analytics-panel">
          <div className="admin-toolbar">
            <div>
              <h3 id="analytics-contact-title">Contacto y PWA</h3>
              <p className="analytics-panel-description">Acciones que acercan la carta al negocio.</p>
            </div>
          </div>
          <div className="analytics-detail-grid analytics-detail-grid--four">
            <DetailStat label="Contactos" value={formatNumber(current.contactPwa.contactActionsTotal)} />
            <DetailStat label="Instalaciones" value={formatNumber(current.contactPwa.pwaInstalls)} />
            <DetailStat label="Prompt aceptado" value={formatNumber(current.contactPwa.pwaPromptAccepted)} />
            <DetailStat label="Prompt descartado" value={formatNumber(current.contactPwa.pwaPromptDismissed)} />
          </div>
          <div className="analytics-subsection">
            <h4>Canales de contacto</h4>
            <AnalyticsBarList
              emptyLabel="Las acciones de contacto aparecerán aquí."
              items={CONTACT_CHANNELS.map(({ key, label }) => ({
                id: key,
                label,
                value: current.contactPwa.contactActions[key],
              })).filter((item) => item.value > 0)}
            />
            <p className="analytics-footnote">
              Son toques registrados: no confirman que una llamada, mensaje o ruta se haya completado.
            </p>
          </div>
        </section>

        <section aria-labelledby="analytics-loyalty-title" className="admin-card analytics-panel">
          <div className="admin-toolbar">
            <div>
              <h3 id="analytics-loyalty-title">Fidelización y premios</h3>
              <p className="analytics-panel-description">Actividad de clientes identificados en D1.</p>
            </div>
            <Link
              className="admin-link"
              search={{ inactive: false, page: 1, search: "", sortBy: "lastVisitAt", sortDir: "desc", period: "30d" }}
              to="/loyalty/insights"
            >
              Ver clientes →
            </Link>
          </div>
          <div className="analytics-detail-grid analytics-detail-grid--four">
            <DetailStat label="Clientes con visita" value={formatNumber(current.loyalty.visits)} />
            <DetailStat label="Visita repetida" value={formatNullablePercent(current.loyalty.repeatVisitRate)} />
            <DetailStat label="Regresan en 30 días" value={formatNullablePercent(current.loyalty.recurrence30dRate)} />
            <DetailStat label="Tarjetas activas" value={formatNumber(current.loyalty.cardsActiveLast30Days)} />
          </div>
          <div className="analytics-inline-stats">
            <InlineStat label="Tarjetas inactivas" value={formatNumber(current.loyalty.cardsInactive)} />
            <InlineStat label="Intervalo mediano" value={formatDays(current.loyalty.medianDaysBetweenVisits)} />
            <InlineStat label="Sellos acumulados" value={formatNumber(current.rewards.stampsBalanceTotal)} />
          </div>
          <div className="analytics-subsection">
            <h4>Premios en el periodo</h4>
            <div className="analytics-inline-stats analytics-inline-stats--five">
              <InlineStat label="Solicitados" value={formatNumber(current.rewards.requested)} />
              <InlineStat label="Validados" value={formatNumber(current.rewards.validated)} />
              <InlineStat label="Pendientes" value={formatNumber(current.rewards.pending)} />
              <InlineStat label="Rechazados" value={formatNumber(current.rewards.rejected)} />
              <InlineStat label="Expirados" value={formatNumber(current.rewards.expired)} />
            </div>
            <div className="analytics-detail-grid">
              <DetailStat
                label="Tiempo al primer premio"
                value={formatHours(current.rewards.medianHoursToFirstReward)}
              />
              <DetailStat
                label="Coste estimado"
                note={current.rewards.estimatedRewardCostCents === null ? "Configura el ticket medio" : undefined}
                value={
                  current.rewards.estimatedRewardCostCents === null
                    ? "—"
                    : formatMoney(current.rewards.estimatedRewardCostCents, tenant.restaurant.sourceCurrency)
                }
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
