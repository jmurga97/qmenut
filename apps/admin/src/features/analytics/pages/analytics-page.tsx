import { Badge } from "@jmurga97/components";
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
import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";
import { getTenantQueryOptions } from "~/shared/api";
import { SegmentedToggle } from "~/shared/components/controls/segmented-toggle";
import { PageHeader } from "~/shared/components/page-header";
import { formatNumber, formatPercent } from "~/shared/services/format";
import { formatMoney } from "~/shared/services/money";

import type { AnalyticsSnapshot } from "../types";

const CONTACT_CHANNELS = [
  { key: "map", label: i18n.t("analytics___Mapa") },
  { key: "phone", label: i18n.t("analytics___Teléfono") },
  { key: "social", label: i18n.t("analytics___Redes sociales") },
  { key: "whatsapp", label: i18n.t("analytics___WhatsApp") },
] as const;

function formatLanguage(code: string): string {
  return code === "all" ? i18n.t("analytics___Todos") : code.toUpperCase();
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function DetailStat({ label, note, value }: { label: string; note?: string; value: string }) {
  return (
    <div className={"analytics-detail-stat"}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </div>
  );
}

function InlineStat({ label, value }: { label: string; value: string }) {
  return (
    <div className={"analytics-inline-stat"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AnalyticsInsightsContent({ snapshot }: { snapshot: AnalyticsSnapshot }) {
  if (snapshot.insufficientData) {
    return (
      <p className={"analytics-state-copy"}>
        {i18n.t(
          "analytics___Aún no hay suficientes cargas en ambos periodos para extraer comparaciones fiables. Necesitamos al menos 20 cargas por periodo.",
        )}
      </p>
    );
  }

  if (snapshot.insights.length === 0) {
    return (
      <p className={"analytics-state-copy"}>
        {i18n.t("analytics___No hay cambios destacados que señalar en este periodo.")}
      </p>
    );
  }

  return (
    <ul className={"analytics-insight-list"}>
      {snapshot.insights.map((insight) => (
        <li key={insight.code}>
          <Badge tone={insight.tone === "improvement" ? "success" : "warning"}>
            {insight.tone === "improvement" ? i18n.t("analytics___Mejora") : i18n.t("analytics___Oportunidad")}
          </Badge>
          <p>{insight.messageEs}</p>
        </li>
      ))}
    </ul>
  );
}

function AnalyticsSummary({ snapshot }: { snapshot: ReturnType<typeof useAnalyticsController>["snapshot"] }) {
  const { comparison, current } = snapshot;
  return (
    <section
      aria-label={i18n.t("analytics___Resumen de analítica")}
      className={"admin-metric-summary analytics-metric-summary"}
    >
      <AnalyticsMetric
        label={i18n.t("analytics___Cargas de carta")}
        note={i18n.t("analytics___Páginas cargadas, todas las sucursales")}
        primary
        trend={comparison ? getAnalyticsTrend(snapshot, "loads") : undefined}
        value={formatNumber(current.loads)}
      />
      <div className="admin-metric-supporting">
        <AnalyticsMetric
          label={i18n.t("analytics___Visitas efímeras")}
          note={i18n.t("analytics___No son clientes únicos")}
          trend={comparison ? getAnalyticsTrend(snapshot, "ephemeral_visits") : undefined}
          value={formatNumber(current.ephemeralVisits)}
        />
        <AnalyticsMetric
          label={i18n.t("analytics___Aperturas / carga")}
          note={i18n.t("analytics___Puede superar 1×")}
          trend={comparison ? getAnalyticsTrend(snapshot, "dish_opens_per_load") : undefined}
          value={formatMultiplier(current.menu.opensPerLoad)}
        />
        <AnalyticsMetric
          label={i18n.t("analytics___Tráfico QR")}
          note={i18n.t("analytics___Cargas atribuidas al enlace QR")}
          trend={comparison ? getAnalyticsTrend(snapshot, "qr_load_share") : undefined}
          value={formatPercent(current.qrLoadShare)}
        />
        <AnalyticsMetric
          label={i18n.t("analytics___Acciones de contacto")}
          note={i18n.t("analytics___Toques registrados")}
          trend={comparison ? getAnalyticsTrend(snapshot, "contact_actions") : undefined}
          value={formatNumber(current.contactPwa.contactActionsTotal)}
        />
      </div>
    </section>
  );
}

function AnalyticsTrafficPanel({ current }: { current: AnalyticsSnapshot["current"] }) {
  return (
    <section aria-labelledby={"analytics-traffic-title"} className={"admin-card analytics-panel"}>
      <div className="admin-toolbar">
        <div>
          <h2 id={"analytics-traffic-title"}>{i18n.t("analytics___Tráfico")}</h2>
          <p className={"analytics-panel-description"}>
            {i18n.t("analytics___Cómo llega la gente y cuándo abre la carta.")}
          </p>
        </div>
        <span className={"analytics-panel-context"}>{i18n.t("analytics___Todas las sucursales")}</span>
      </div>
      <div className={"analytics-detail-grid"}>
        <DetailStat
          label={i18n.t("analytics___Carta instalada")}
          note={i18n.t("analytics___Uso en modo PWA")}
          value={formatPercent(current.standaloneShare)}
        />
        <DetailStat
          label={i18n.t("analytics___Visitas efímeras")}
          note={i18n.t("analytics___Sumadas por bloque analítico")}
          value={formatNumber(current.ephemeralVisits)}
        />
      </div>
      <div className={"analytics-subsection"}>
        <h3>{i18n.t("analytics___Idiomas")}</h3>
        <AnalyticsBarList
          items={current.languages.map((language) => ({
            id: language.code,
            label: formatLanguage(language.code),
            value: language.loads,
          }))}
        />
      </div>
      <div className={"analytics-subsection"}>
        <h3>{i18n.t("analytics___Sucursales")}</h3>
        <AnalyticsBarList
          items={current.branches.map((branch) => ({
            id: branch.branchId,
            label: branch.name ?? i18n.t("analytics___Sucursal sin nombre"),
            value: branch.loads,
          }))}
        />
      </div>
      <div className={"analytics-subsection"}>
        <h3>{i18n.t("analytics___Horas punta")}</h3>
        {current.peakHours.length === 0 ? (
          <p className={"analytics-empty-detail"}>{i18n.t("analytics___No hay horas punta disponibles todavía.")}</p>
        ) : (
          <ul className={"analytics-chip-list"}>
            {current.peakHours.map((peak) => (
              <li key={peak.hour}>
                <strong>{formatHour(peak.hour)}</strong>
                <span>
                  {formatNumber(peak.loads)} {i18n.t("analytics___cargas")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function AnalyticsMenuPanel({ current }: { current: AnalyticsSnapshot["current"] }) {
  return (
    <section aria-labelledby={"analytics-menu-title"} className={"admin-card analytics-panel"}>
      <div className="admin-toolbar">
        <div>
          <h2 id={"analytics-menu-title"}>{i18n.t("analytics___Menú")}</h2>
          <p className={"analytics-panel-description"}>{i18n.t("analytics___Qué contenido despierta más interés.")}</p>
        </div>
        <span className={"analytics-panel-context"}>{i18n.t("analytics___Aperturas registradas")}</span>
      </div>
      <div className={"analytics-detail-grid analytics-detail-grid--four"}>
        <DetailStat
          label={i18n.t("analytics___Aperturas de platos")}
          value={formatNumber(current.menu.dishOpensTotal)}
        />
        <DetailStat
          label={i18n.t("analytics___Aperturas / carga")}
          value={formatMultiplier(current.menu.opensPerLoad)}
        />
        <DetailStat label={i18n.t("analytics___Desde destacados")} value={formatNumber(current.menu.featuredOpens)} />
        <DetailStat label={i18n.t("analytics___Desde secciones")} value={formatNumber(current.menu.sectionOpens)} />
      </div>
      <div className={"analytics-subsection"}>
        <h3>{i18n.t("analytics___Platos más abiertos")}</h3>
        <AnalyticsBarList
          emptyLabel={i18n.t("analytics___Las aperturas de platos aparecerán aquí.")}
          items={current.menu.topDishes.slice(0, 5).map((dish) => ({
            id: dish.dishId,
            label: dish.name,
            meta: i18n.t("analytics___{{count}} por carga", { count: formatMultiplier(dish.openRatePerLoad) }),
            value: dish.opens,
          }))}
        />
      </div>
      <div className={"analytics-subsection"}>
        <h3>{i18n.t("analytics___Categorías")}</h3>
        <div className={"analytics-inline-stats"}>
          <InlineStat
            label={i18n.t("analytics___Categorías alcanzadas")}
            value={formatNumber(current.menu.categoriesReached)}
          />
          <InlineStat label={i18n.t("analytics___Selecciones")} value={formatNumber(current.menu.categoriesSelected)} />
          <InlineStat
            label={i18n.t("analytics___Mayor profundidad")}
            value={current.menu.maxDepthPosition === null ? "—" : formatNumber(current.menu.maxDepthPosition)}
          />
        </div>
      </div>
      <div className={"analytics-subsection"}>
        <h3>{i18n.t("analytics___Promociones")}</h3>
        <p className={"analytics-subsection-summary"}>
          {formatNumber(current.menu.promotionOpensTotal)} {i18n.t("analytics___aperturas en total")}
        </p>
        <AnalyticsBarList
          emptyLabel={i18n.t("analytics___Las aperturas de promociones aparecerán aquí.")}
          items={current.menu.topPromotions.slice(0, 3).map((promotion) => ({
            id: promotion.promotionId,
            label: promotion.promotionName ?? i18n.t("analytics___Promoción sin nombre"),
            value: promotion.openCount,
          }))}
        />
      </div>
    </section>
  );
}

export function AnalyticsPage() {
  const { data: tenant } = useSuspenseQuery(getTenantQueryOptions({ trpc }));
  const { refreshing, search, setPeriod, snapshot } = useAnalyticsController();
  const current = snapshot.current;
  const rangeLabel = formatAnalyticsDateRange(snapshot);

  return (
    <div className={"ming-page admin-page analytics-page"}>
      <PageHeader
        description={i18n.t("analytics___Datos del {{range}} · agregados para todas las sucursales.", {
          range: rangeLabel,
        })}
        kicker={i18n.t("analytics___Analítica")}
        title={i18n.t("analytics___Qué está pasando en tu carta")}
      />

      <div className={"admin-toolbar analytics-period-toolbar"}>
        <div className={"analytics-period-copy"}>
          <span className="admin-kicker">{i18n.t("analytics___Comparación")}</span>
          <strong>
            {snapshot.comparisonPeriod
              ? i18n.t("analytics___Frente al periodo anterior")
              : i18n.t("analytics___Sin periodo anterior")}
          </strong>
        </div>
        <SegmentedToggle
          ariaLabel={i18n.t("analytics___Periodo de analítica")}
          onChange={(value) => void setPeriod(value)}
          options={ANALYTICS_PERIOD_OPTIONS}
          value={search.period}
        />
      </div>

      <div
        aria-busy={refreshing || undefined}
        className={refreshing ? "admin-data-region admin-refreshing" : "admin-data-region"}
      >
        <AnalyticsSummary snapshot={snapshot} />

        <section
          aria-labelledby={"analytics-insights-title"}
          className={"admin-card analytics-panel analytics-insights"}
        >
          <div className="admin-toolbar">
            <div>
              <h2 id={"analytics-insights-title"}>{i18n.t("analytics___Lecturas")}</h2>
              <p className={"analytics-panel-description"}>
                {i18n.t("analytics___Señales para decidir qué revisar a continuación.")}
              </p>
            </div>
            <span className={"analytics-period-label"}>{rangeLabel}</span>
          </div>
          <AnalyticsInsightsContent snapshot={snapshot} />
        </section>

        <div className={"analytics-grid"}>
          <AnalyticsTrafficPanel current={current} />

          <AnalyticsMenuPanel current={current} />

          <section aria-labelledby={"analytics-contact-title"} className={"admin-card analytics-panel"}>
            <div className="admin-toolbar">
              <div>
                <h2 id={"analytics-contact-title"}>{i18n.t("analytics___Contacto y PWA")}</h2>
                <p className={"analytics-panel-description"}>
                  {i18n.t("analytics___Acciones que acercan la carta al negocio.")}
                </p>
              </div>
            </div>
            <div className={"analytics-detail-grid analytics-detail-grid--four"}>
              <DetailStat
                label={i18n.t("analytics___Contactos")}
                value={formatNumber(current.contactPwa.contactActionsTotal)}
              />
              <DetailStat
                label={i18n.t("analytics___Instalaciones")}
                value={formatNumber(current.contactPwa.pwaInstalls)}
              />
              <DetailStat
                label={i18n.t("analytics___Prompt aceptado")}
                value={formatNumber(current.contactPwa.pwaPromptAccepted)}
              />
              <DetailStat
                label={i18n.t("analytics___Prompt descartado")}
                value={formatNumber(current.contactPwa.pwaPromptDismissed)}
              />
            </div>
            <div className={"analytics-subsection"}>
              <h3>{i18n.t("analytics___Canales de contacto")}</h3>
              <AnalyticsBarList
                emptyLabel={i18n.t("analytics___Las acciones de contacto aparecerán aquí.")}
                items={CONTACT_CHANNELS.map(({ key, label }) => ({
                  id: key,
                  label,
                  value: current.contactPwa.contactActions[key],
                })).filter((item) => item.value > 0)}
              />
              <p className={"analytics-footnote"}>
                {i18n.t(
                  "analytics___Son toques registrados: no confirman que una llamada, mensaje o ruta se haya completado.",
                )}
              </p>
            </div>
          </section>

          <section aria-labelledby={"analytics-loyalty-title"} className={"admin-card analytics-panel"}>
            <div className="admin-toolbar">
              <div>
                <h2 id={"analytics-loyalty-title"}>{i18n.t("analytics___Fidelización y premios")}</h2>
                <p className={"analytics-panel-description"}>
                  {i18n.t("analytics___Actividad de clientes identificados en D1.")}
                </p>
              </div>
              <Link
                className="admin-link"
                search={{ inactive: false, page: 1, search: "", sortBy: "lastVisitAt", sortDir: "desc", period: "30d" }}
                to={"/loyalty/insights"}
              >
                {i18n.t("analytics___Ver clientes →")}
              </Link>
            </div>
            <div className={"analytics-detail-grid analytics-detail-grid--four"}>
              <DetailStat
                label={i18n.t("analytics___Clientes con visita")}
                value={formatNumber(current.loyalty.visits)}
              />
              <DetailStat
                label={i18n.t("analytics___Visita repetida")}
                value={formatNullablePercent(current.loyalty.repeatVisitRate)}
              />
              <DetailStat
                label={i18n.t("analytics___Regresan en 30 días")}
                value={formatNullablePercent(current.loyalty.recurrence30dRate)}
              />
              <DetailStat
                label={i18n.t("analytics___Tarjetas activas")}
                value={formatNumber(current.loyalty.cardsActiveLast30Days)}
              />
            </div>
            <div className={"analytics-inline-stats"}>
              <InlineStat
                label={i18n.t("analytics___Tarjetas inactivas")}
                value={formatNumber(current.loyalty.cardsInactive)}
              />
              <InlineStat
                label={i18n.t("analytics___Intervalo mediano")}
                value={formatDays(current.loyalty.medianDaysBetweenVisits)}
              />
              <InlineStat
                label={i18n.t("analytics___Sellos acumulados")}
                value={formatNumber(current.rewards.stampsBalanceTotal)}
              />
            </div>
            <div className={"analytics-subsection"}>
              <h3>{i18n.t("analytics___Premios en el periodo")}</h3>
              <div className={"analytics-inline-stats analytics-inline-stats--five"}>
                <InlineStat label={i18n.t("analytics___Solicitados")} value={formatNumber(current.rewards.requested)} />
                <InlineStat label={i18n.t("analytics___Validados")} value={formatNumber(current.rewards.validated)} />
                <InlineStat label={i18n.t("analytics___Pendientes")} value={formatNumber(current.rewards.pending)} />
                <InlineStat label={i18n.t("analytics___Rechazados")} value={formatNumber(current.rewards.rejected)} />
                <InlineStat label={i18n.t("analytics___Expirados")} value={formatNumber(current.rewards.expired)} />
              </div>
              <div className={"analytics-detail-grid"}>
                <DetailStat
                  label={i18n.t("analytics___Tiempo al primer premio")}
                  value={formatHours(current.rewards.medianHoursToFirstReward)}
                />
                <DetailStat
                  label={i18n.t("analytics___Coste estimado")}
                  note={
                    current.rewards.estimatedRewardCostCents === null
                      ? i18n.t("analytics___Configura el ticket medio")
                      : undefined
                  }
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
    </div>
  );
}
