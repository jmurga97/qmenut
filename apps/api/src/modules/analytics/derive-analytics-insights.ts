import { MIN_LOADS_FOR_INSIGHTS } from "./get-restaurant-analytics-snapshot";

import type {
  AnalyticsComparison,
  AnalyticsInsight,
  MetricTrend,
  RestaurantAnalyticsPeriod,
} from "./restaurant-analytics.types";

/**
 * Reglas deterministas de insights: como máximo tres mejoras y tres oportunidades,
 * ordenadas por magnitud del cambio. Sin heurísticas estadísticas: solo umbrales fijos.
 */

const PERCENT = (value: number): string => `${Math.round(value * 100)}%`;
const POINTS = (value: number): string => `${Math.round(Math.abs(value) * 100)} p.p.`;
function pointsOf(trend: MetricTrend): number {
  return trend.kind === "rate" ? Math.max(trend.changePoints ?? 0, 0) : 0;
}

function messagePoints(trend: MetricTrend): string {
  return POINTS(pointsOf(trend));
}

interface InsightRule {
  code: string;
  score: (input: RuleInput) => number;
  message: (input: RuleInput) => string;
  tone: "improvement" | "opportunity";
}

interface RuleInput {
  comparison: AnalyticsComparison;
  current: RestaurantAnalyticsPeriod;
  previous: RestaurantAnalyticsPeriod;
}

const IMPROVEMENT_RULES: InsightRule[] = [
  {
    code: "improvement.dish_opens_up",
    tone: "improvement",
    score: ({ comparison }) => pointsOf(comparison.metrics.dish_opens_per_load),
    message: ({ comparison }) =>
      `Las aperturas de platos por carga subieron ${messagePoints(comparison.metrics.dish_opens_per_load)} respecto a la quincena anterior.`,
  },
  {
    code: "improvement.qr_attribution_up",
    tone: "improvement",
    score: ({ comparison }) => pointsOf(comparison.metrics.qr_load_share),
    message: ({ comparison }) =>
      `Las cargas atribuidas a enlace QR ganaron ${messagePoints(comparison.metrics.qr_load_share)}.`,
  },
  {
    code: "improvement.standalone_up",
    tone: "improvement",
    score: ({ comparison }) => pointsOf(comparison.metrics.standalone_share),
    message: ({ comparison }) =>
      `Más clientes usan la carta instalada: ${messagePoints(comparison.metrics.standalone_share)} más que en la quincena anterior.`,
  },
  {
    code: "improvement.repeat_visits_up",
    tone: "improvement",
    score: ({ comparison }) => pointsOf(comparison.metrics.repeat_visit_rate),
    message: ({ comparison }) =>
      `La tasa de repetición de clientes subió ${messagePoints(comparison.metrics.repeat_visit_rate)}.`,
  },
];

const OPPORTUNITY_RULES: InsightRule[] = [
  {
    code: "opportunity.contact_actions_low",
    tone: "opportunity",
    score: ({ current }) =>
      current.loads > 0 && current.contactPwa.contactActionsTotal / current.loads < 0.05 ? 1 : 0,
    message: ({ current }) =>
      `Solo ${PERCENT(current.loads > 0 ? current.contactPwa.contactActionsTotal / current.loads : 0)} de las cargas terminan en una llamada, WhatsApp o mapa.`,
  },
  {
    code: "opportunity.inactive_cards_high",
    tone: "opportunity",
    score: ({ current }) =>
      current.loyalty.cardsTotal > 0 && current.loyalty.cardsInactive / current.loyalty.cardsTotal >= 0.4 ? 1 : 0,
    message: ({ current }) =>
      `${PERCENT(current.loyalty.cardsInactive / Math.max(current.loyalty.cardsTotal, 1))} de las tarjetas llevan más de 30 días sin visitar.`,
  },
];

const MAX_INSIGHTS_PER_TONE = 3;

export interface DeriveInsightsInput {
  comparison: AnalyticsComparison;
  current: RestaurantAnalyticsPeriod;
  previous: RestaurantAnalyticsPeriod;
}

export function deriveAnalyticsInsights({ comparison, current, previous }: DeriveInsightsInput): AnalyticsInsight[] {
  if (current.loads < MIN_LOADS_FOR_INSIGHTS || previous.loads < MIN_LOADS_FOR_INSIGHTS) {
    return [];
  }

  const input: RuleInput = { comparison, current, previous };

  const pickTop = (rules: InsightRule[]): AnalyticsInsight[] =>
    rules
      .map((rule) => ({ rule, score: rule.score(input) }))
      .filter((candidate) => candidate.score > 0)
      .toSorted((a, b) => b.score - a.score)
      .slice(0, MAX_INSIGHTS_PER_TONE)
      .map(({ rule }) => ({ code: rule.code, messageEs: rule.message(input), tone: rule.tone }));

  return [...pickTop(IMPROVEMENT_RULES), ...pickTop(OPPORTUNITY_RULES)];
}
