import { getLoyaltyProgram } from "@qmenut/db/repositories/loyalty-admin.repository";
import {
  getCardsSummary,
  getCategoryTotals,
  getContactChannelTotals,
  getDishSummary,
  getDishSourceSplit,
  getEventCounterTotals,
  getHourlyLoads,
  getLoyaltyVisitors,
  getLoadsByBranch,
  getLoadsByLanguage,
  getMedianHoursToFirstReward,
  getPromotionSummary,
  getRedemptionStatusCounts,
  getTrafficSummary,
  listValidatedRedemptionsInPeriod,
} from "@qmenut/db/repositories/restaurant-analytics.repository";

import type {
  AnalyticsComparison,
  LoyaltyView,
  MetricTrend,
  RestaurantAnalyticsPeriod,
  RestaurantAnalyticsSnapshot,
  RewardsView,
} from "./restaurant-analytics.types";
import type { DrizzleDb } from "@qmenut/db/client";
import type { RewardReturnRow } from "@qmenut/db/repositories/restaurant-analytics.repository";

/**
 * Servicio interno de snapshots de analítica por restaurante. Agrupa el comportamiento
 * anónimo materializado desde PostHog y la fidelización calculada desde D1, compara el
 * periodo con el periodo anterior y deriva insights deterministas. El endpoint autenticado
 * del admin reutiliza exactamente esta función.
 */

const TOP_DISHES_LIMIT = 10;
const TOP_PROMOTIONS_LIMIT = 5;
const PEAK_HOURS_LIMIT = 3;

interface PeriodBounds {
  fromDay: string;
  toDay: string;
}

function ratio(part: number, total: number): number | null {
  return total > 0 ? part / total : null;
}

function rewardCostFor(row: RewardReturnRow, ticketMedio: number): number {
  switch (row.type) {
    case "free_dish":
      return row.dishPrice ?? 0;
    case "special_price":
      return row.dishPrice !== null && row.specialPrice !== null ? row.dishPrice - row.specialPrice : 0;
    case "percentage_discount":
      return row.percentage === null ? 0 : Math.round((row.percentage / 100) * ticketMedio);
  }
}

/** Misma fórmula que admin-loyalty insights (coste estimado del premio validado). */
function sumRewardCost(rows: RewardReturnRow[], ticketMedio: number): number {
  let total = 0;

  for (const row of rows) {
    total += rewardCostFor(row, ticketMedio);
  }

  return total;
}

async function buildLoyaltyRewards({
  bounds,
  db,
  restaurantId,
}: {
  bounds: PeriodBounds;
  db: DrizzleDb;
  restaurantId: string;
}): Promise<{ loyalty: LoyaltyView; rewards: RewardsView }> {
  const fromMs = Date.parse(`${bounds.fromDay}T00:00:00Z`);
  const toMs = Date.parse(`${bounds.toDay}T23:59:59.999Z`);
  const loyaltyInput = { db, fromMs, restaurantId, toMs };

  const [visitors, cards] = await Promise.all([
    getLoyaltyVisitors(loyaltyInput),
    getCardsSummary({ activeCutoffMs: toMs - 30 * 24 * 60 * 60 * 1000, db, restaurantId }),
  ]);
  const [statuses, validatedRedemptions] = await Promise.all([
    getRedemptionStatusCounts(loyaltyInput),
    listValidatedRedemptionsInPeriod(loyaltyInput),
  ]);
  const [medianHoursToFirstReward, program] = await Promise.all([
    getMedianHoursToFirstReward(loyaltyInput),
    getLoyaltyProgram({ db, restaurantId }),
  ]);
  const ticketMedio = program?.ticketMedio ?? null;
  const estimatedRewardCostCents = ticketMedio === null ? null : sumRewardCost(validatedRedemptions, ticketMedio);

  return {
    loyalty: {
      cardsTotal: cards.total,
      cardsActiveLast30Days: cards.activeLast30Days,
      cardsInactive: Math.max(cards.total - cards.activeLast30Days, 0),
      visits: visitors.visitors,
      repeatVisitRate: ratio(visitors.repeaters, visitors.visitors),
      medianDaysBetweenVisits: visitors.medianDaysBetweenVisits,
      recurrence30dRate: ratio(visitors.returnsWithin30Days, visitors.visitsWithPrevious),
    },
    rewards: {
      requested: statuses.requested,
      validated: statuses.validated,
      rejected: statuses.rejected,
      expired: statuses.expired,
      pending: statuses.pending,
      medianHoursToFirstReward,
      estimatedRewardCostCents,
      stampsBalanceTotal: cards.stampsBalanceTotal,
    },
  };
}

async function buildPeriodView({
  bounds,
  db,
  restaurantId,
}: {
  bounds: PeriodBounds;
  db: DrizzleDb;
  restaurantId: string;
}): Promise<RestaurantAnalyticsPeriod> {
  const input = { db, fromDay: bounds.fromDay, restaurantId, toDay: bounds.toDay };

  const [traffic, languages] = await Promise.all([getTrafficSummary(input), getLoadsByLanguage(input)]);
  const [branches, hourly] = await Promise.all([getLoadsByBranch(input), getHourlyLoads(input)]);
  const [dishSummary, sourceSplit] = await Promise.all([
    getDishSummary(input, TOP_DISHES_LIMIT),
    getDishSourceSplit(input),
  ]);
  const [categories, promotionSummary] = await Promise.all([
    getCategoryTotals(input),
    getPromotionSummary(input, TOP_PROMOTIONS_LIMIT),
  ]);
  const [contactChannels, counters] = await Promise.all([getContactChannelTotals(input), getEventCounterTotals(input)]);
  const { loyalty, rewards } = await buildLoyaltyRewards({ bounds, db, restaurantId });

  const contactActionsTotal =
    contactChannels.map + contactChannels.phone + contactChannels.social + contactChannels.whatsapp;
  const peakHours = hourly.toSorted((a, b) => b.loads - a.loads).slice(0, PEAK_HOURS_LIMIT);

  return {
    loads: traffic.loads,
    ephemeralVisits: traffic.ephemeralVisits,
    qrLoadShare: ratio(traffic.qrLoads, traffic.loads) ?? 0,
    standaloneShare: ratio(traffic.standaloneLoads, traffic.loads) ?? 0,
    languages,
    branches,
    peakHours,
    menu: {
      topDishes: dishSummary.topDishes.map((dish) => ({
        ...dish,
        openRatePerLoad: ratio(dish.opens, traffic.loads) ?? 0,
      })),
      dishOpensTotal: dishSummary.totalOpens,
      opensPerLoad: ratio(dishSummary.totalOpens, traffic.loads) ?? 0,
      featuredOpens: sourceSplit.featuredOpens,
      sectionOpens: sourceSplit.sectionOpens,
      categoriesReached: categories.reachedCount,
      categoriesSelected: categories.selectedCount,
      maxDepthPosition: categories.maxDepthPosition,
      promotionOpensTotal: promotionSummary.totalOpens,
      topPromotions: promotionSummary.topPromotions,
    },
    contactPwa: {
      contactActions: contactChannels,
      contactActionsTotal,
      pwaInstalls: counters.get("pwa_installed") ?? 0,
      pwaPromptAccepted: counters.get("pwa_install_prompt_accepted") ?? 0,
      pwaPromptDismissed: counters.get("pwa_install_prompt_dismissed") ?? 0,
    },
    loyalty,
    rewards,
  };
}

function countTrend(current: number, previous: number): MetricTrend {
  return {
    kind: "count",
    current,
    previous,
    changeRatio: previous > 0 ? (current - previous) / previous : null,
  };
}

function rateTrend(current: number | null, previous: number | null): MetricTrend {
  return {
    kind: "rate",
    current,
    previous,
    changePoints: current !== null && previous !== null ? current - previous : null,
  };
}

function buildComparison(current: RestaurantAnalyticsPeriod, previous: RestaurantAnalyticsPeriod): AnalyticsComparison {
  return {
    metrics: {
      loads: countTrend(current.loads, previous.loads),
      ephemeral_visits: countTrend(current.ephemeralVisits, previous.ephemeralVisits),
      qr_load_share: rateTrend(current.qrLoadShare, previous.qrLoadShare),
      standalone_share: rateTrend(current.standaloneShare, previous.standaloneShare),
      dish_opens_per_load: rateTrend(current.menu.opensPerLoad, previous.menu.opensPerLoad),
      featured_opens: countTrend(current.menu.featuredOpens, previous.menu.featuredOpens),
      promotion_opens: countTrend(current.menu.promotionOpensTotal, previous.menu.promotionOpensTotal),
      contact_actions: countTrend(current.contactPwa.contactActionsTotal, previous.contactPwa.contactActionsTotal),
      pwa_installs: countTrend(current.contactPwa.pwaInstalls, previous.contactPwa.pwaInstalls),
      loyalty_visits: countTrend(current.loyalty.visits, previous.loyalty.visits),
      repeat_visit_rate: rateTrend(current.loyalty.repeatVisitRate, previous.loyalty.repeatVisitRate),
      recurrence_30d_rate: rateTrend(current.loyalty.recurrence30dRate, previous.loyalty.recurrence30dRate),
      rewards_validated: countTrend(current.rewards.validated, previous.rewards.validated),
    },
  };
}

export interface GetRestaurantAnalyticsSnapshotInput {
  db: DrizzleDb;
  /** Día local (YYYY-MM-DD) inicial del periodo, incluido. */
  from: string;
  /** Día local final del periodo, incluido. */
  to: string;
  /** Inicio del periodo de comparación; por defecto los 15 días anteriores. */
  comparisonFrom?: string;
  comparisonTo?: string;
  restaurantId: string;
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function shiftDays(day: string, amount: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + amount * 86_400_000).toISOString().slice(0, 10);
}

/** Umbral mínimo de cargas en ambos periodos para permitir conclusiones comparativas. */
export const MIN_LOADS_FOR_INSIGHTS = 20;

export async function getRestaurantAnalyticsSnapshot({
  comparisonFrom,
  comparisonTo,
  db,
  from,
  restaurantId,
  to,
}: GetRestaurantAnalyticsSnapshotInput): Promise<RestaurantAnalyticsSnapshot> {
  if (!DAY_PATTERN.test(from) || !DAY_PATTERN.test(to) || from > to) {
    throw new Error("Rango de periodo inválido");
  }

  const resolvedComparison: PeriodBounds | null =
    comparisonFrom && comparisonTo
      ? { fromDay: comparisonFrom, toDay: comparisonTo }
      : { fromDay: shiftDays(from, -15), toDay: shiftDays(from, -1) };

  if (!DAY_PATTERN.test(resolvedComparison.fromDay) || !DAY_PATTERN.test(resolvedComparison.toDay)) {
    throw new Error("Rango de comparación inválido");
  }

  const current = await buildPeriodView({ bounds: { fromDay: from, toDay: to }, db, restaurantId });
  const previous = await buildPeriodView({ bounds: resolvedComparison, db, restaurantId });

  const insufficientData = current.loads < MIN_LOADS_FOR_INSIGHTS || previous.loads < MIN_LOADS_FOR_INSIGHTS;
  const comparison = buildComparison(current, previous);

  const { deriveAnalyticsInsights } = await import("./derive-analytics-insights");
  const insights = insufficientData ? [] : deriveAnalyticsInsights({ comparison, current, previous });

  return {
    restaurantId,
    period: { fromDay: from, toDay: to },
    comparisonPeriod: resolvedComparison,
    current,
    previous,
    comparison,
    insights,
    insufficientData,
  };
}
