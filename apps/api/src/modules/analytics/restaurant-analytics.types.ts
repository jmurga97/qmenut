import type {
  BranchShare,
  ChannelTotals,
  HourLoad,
  LanguageShare,
  TopDish,
  TopPromotion,
} from "@qmenut/db/repositories/restaurant-analytics.repository";

/** Modelo interno del resumen quincenal; el futuro endpoint de admin reutilizará esto. */

export interface DishEngagement extends TopDish {
  /** Aperturas del plato divididas por cargas de carta del periodo. */
  openRatePerLoad: number;
}

export interface MenuEngagement {
  topDishes: DishEngagement[];
  dishOpensTotal: number;
  /** Aperturas totales divididas por cargas; puede superar 100 % si se abren varios platos. */
  opensPerLoad: number;
  featuredOpens: number;
  sectionOpens: number;
  categoriesReached: number;
  categoriesSelected: number;
  maxDepthPosition: number | null;
  promotionOpensTotal: number;
  topPromotions: TopPromotion[];
}

export interface ContactPwaUsage {
  contactActions: ChannelTotals;
  contactActionsTotal: number;
  pwaInstalls: number;
  pwaPromptAccepted: number;
  pwaPromptDismissed: number;
}

export interface LoyaltyView {
  cardsTotal: number;
  cardsActiveLast30Days: number;
  cardsInactive: number;
  visits: number;
  repeatVisitRate: number | null;
  medianDaysBetweenVisits: number | null;
  recurrence30dRate: number | null;
}

export interface RewardsView {
  requested: number;
  validated: number;
  rejected: number;
  expired: number;
  pending: number;
  /** Horas desde el alta de tarjeta hasta el primer premio validado (mediana). */
  medianHoursToFirstReward: number | null;
  /** Coste estimado de premios validados en el periodo, en céntimos; null sin ticket medio. */
  estimatedRewardCostCents: number | null;
  stampsBalanceTotal: number;
}

export interface RestaurantAnalyticsPeriod {
  loads: number;
  ephemeralVisits: number;
  qrLoadShare: number;
  standaloneShare: number;
  languages: LanguageShare[];
  branches: BranchShare[];
  peakHours: HourLoad[];
  menu: MenuEngagement;
  contactPwa: ContactPwaUsage;
  loyalty: LoyaltyView;
  rewards: RewardsView;
}

export type MetricTrend =
  | { kind: "count"; current: number; previous: number; changeRatio: number | null }
  | { kind: "rate"; current: number | null; previous: number | null; changePoints: number | null };

export interface AnalyticsComparison {
  metrics: Record<string, MetricTrend>;
}

export interface AnalyticsInsight {
  code: string;
  tone: "improvement" | "opportunity";
  messageEs: string;
}

export interface RestaurantAnalyticsSnapshot {
  restaurantId: string;
  period: { fromDay: string; toDay: string };
  comparisonPeriod: { fromDay: string; toDay: string } | null;
  current: RestaurantAnalyticsPeriod;
  previous: RestaurantAnalyticsPeriod | null;
  comparison: AnalyticsComparison | null;
  insights: AnalyticsInsight[];
  insufficientData: boolean;
}
