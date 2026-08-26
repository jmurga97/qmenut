import type { RestaurantAnalyticsPeriod, RestaurantAnalyticsSnapshot } from "../restaurant-analytics.types";

/**
 * Traduce el snapshot al contrato del template `analytics-digest` de ming-email-worker:
 * códigos de métricas/insights y valores estructurados. Nunca HTML ni asunto libre (el
 * asunto lo fija la política del email worker).
 */

export type DigestMetricCode =
  | "contact_actions"
  | "dish_opens_per_load"
  | "estimated_reward_cost"
  | "loads"
  | "loyalty_visits"
  | "pwa_installs"
  | "promotion_opens"
  | "qr_load_share"
  | "repeat_visit_rate"
  | "rewards_validated"
  | "standalone_share";

export type DigestMetricFormat = "count" | "currency" | "percent";

export interface DigestMetric {
  code: DigestMetricCode;
  format: DigestMetricFormat;
  previousValue: number | null;
  value: number;
}

export interface DigestInsight {
  text: string;
  tone: "attention" | "positive";
}

export interface AnalyticsDigestEmailData {
  insights: DigestInsight[];
  metrics: DigestMetric[];
  periodEnd: string;
  periodStart: string;
  restaurantName: string;
}

function percent(value: number): number {
  return Math.round(value * 1000) / 10;
}

type MetricSink = (metric: DigestMetric) => void;

function createMetricSink(metrics: DigestMetric[]): MetricSink {
  return (metric) => {
    metrics.push(metric);
  };
}

function buildTrafficMetrics({
  current,
  previous,
  push,
}: {
  current: RestaurantAnalyticsPeriod;
  previous: RestaurantAnalyticsPeriod | null;
  push: MetricSink;
}): void {
  push({ code: "loads", format: "count", previousValue: previous?.loads ?? null, value: current.loads });
  push({
    code: "dish_opens_per_load",
    format: "percent",
    previousValue: previous ? percent(previous.menu.opensPerLoad) : null,
    value: percent(current.menu.opensPerLoad),
  });
  push({
    code: "qr_load_share",
    format: "percent",
    previousValue: previous ? percent(previous.qrLoadShare) : null,
    value: percent(current.qrLoadShare),
  });
  push({
    code: "standalone_share",
    format: "percent",
    previousValue: previous ? percent(previous.standaloneShare) : null,
    value: percent(current.standaloneShare),
  });
  push({
    code: "contact_actions",
    format: "count",
    previousValue: previous?.contactPwa.contactActionsTotal ?? null,
    value: current.contactPwa.contactActionsTotal,
  });
  push({
    code: "pwa_installs",
    format: "count",
    previousValue: previous?.contactPwa.pwaInstalls ?? null,
    value: current.contactPwa.pwaInstalls,
  });
}

function buildLoyaltyMetrics({
  current,
  previous,
  push,
}: {
  current: RestaurantAnalyticsPeriod;
  previous: RestaurantAnalyticsPeriod | null;
  push: MetricSink;
}): void {
  push({
    code: "loyalty_visits",
    format: "count",
    previousValue: previous?.loyalty.visits ?? null,
    value: current.loyalty.visits,
  });

  if (current.loyalty.repeatVisitRate !== null) {
    const previousRepeat = previous?.loyalty.repeatVisitRate ?? null;

    push({
      code: "repeat_visit_rate",
      format: "percent",
      previousValue: previousRepeat === null ? null : percent(previousRepeat),
      value: percent(current.loyalty.repeatVisitRate),
    });
  }

  push({
    code: "rewards_validated",
    format: "count",
    previousValue: previous?.rewards.validated ?? null,
    value: current.rewards.validated,
  });

  if (current.rewards.estimatedRewardCostCents !== null) {
    push({
      code: "estimated_reward_cost",
      format: "currency",
      previousValue: previous?.rewards.estimatedRewardCostCents ?? null,
      value: current.rewards.estimatedRewardCostCents,
    });
  }
}

function buildMetrics(current: RestaurantAnalyticsPeriod, previous: RestaurantAnalyticsPeriod | null): DigestMetric[] {
  const metrics: DigestMetric[] = [];
  const push = createMetricSink(metrics);

  buildTrafficMetrics({ current, previous, push });
  buildLoyaltyMetrics({ current, previous, push });

  return metrics;
}

export function buildDigestEmailData(
  snapshot: RestaurantAnalyticsSnapshot,
  restaurantName: string,
): AnalyticsDigestEmailData {
  return {
    insights: snapshot.insights.map((insight) => ({
      text: insight.messageEs,
      tone: insight.tone === "improvement" ? ("positive" as const) : ("attention" as const),
    })),
    metrics: buildMetrics(snapshot.current, snapshot.previous),
    periodEnd: snapshot.period.toDay,
    periodStart: snapshot.period.fromDay,
    restaurantName,
  };
}
