import { sql } from "drizzle-orm";

import type { DrizzleDb } from "../client";

/**
 * Lecturas agregadas para `getRestaurantAnalyticsSnapshot`: el comportamiento anónimo
 * proviene de las tablas materializadas de PostHog, mientras que la fidelización y los
 * premios se calculan directamente
 * sobre las tablas transaccionales de D1, que siguen siendo la fuente autoritativa de
 * altas, sellos y canjes.
 */

export interface RestaurantAnalyticsPeriodInput {
  db: DrizzleDb;
  fromDay: string;
  restaurantId: string;
  toDay: string;
}

export interface TrafficSummary {
  loads: number;
  ephemeralVisits: number;
  qrLoads: number;
  standaloneLoads: number;
}

export interface LanguageShare {
  code: string;
  loads: number;
}

export interface BranchShare {
  branchId: string;
  loads: number;
  name: string | null;
}

export interface HourLoad {
  hour: number;
  loads: number;
}

export interface TopDish {
  dishId: string;
  name: string;
  opens: number;
  visitsWithOpen: number;
}

export interface DishSummary {
  totalOpens: number;
  topDishes: TopDish[];
}

export interface SourceSplit {
  featuredOpens: number;
  sectionOpens: number;
}

export interface CategoryTotals {
  reachedCount: number;
  selectedCount: number;
  maxDepthPosition: number | null;
}

export interface TopPromotion {
  openCount: number;
  promotionId: string;
  promotionName: string | null;
}

export interface PromotionSummary {
  topPromotions: TopPromotion[];
  totalOpens: number;
}

export interface ChannelTotals {
  map: number;
  phone: number;
  social: number;
  whatsapp: number;
}

function toNumber(value: unknown): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

export async function getTrafficSummary({
  db,
  fromDay,
  restaurantId,
  toDay,
}: RestaurantAnalyticsPeriodInput): Promise<TrafficSummary> {
  const [totals] = await db.all<{ loads: number; visits: number }>(sql`
    SELECT SUM(mv.views) AS loads, SUM(mv.visits) AS visits
    FROM menu_view_daily mv
    JOIN branches b ON b.id = mv.branch_id
    WHERE b.restaurant_id = ${restaurantId} AND mv.day BETWEEN ${fromDay} AND ${toDay}
  `);
  const [qr] = await db.all<{ loads: number }>(sql`
    SELECT SUM(mv.views) AS loads
    FROM menu_view_daily mv
    JOIN branches b ON b.id = mv.branch_id
    WHERE b.restaurant_id = ${restaurantId} AND mv.day BETWEEN ${fromDay} AND ${toDay} AND mv.source = 'qr'
  `);
  const [standalone] = await db.all<{ loads: number }>(sql`
    SELECT SUM(mv.views) AS loads
    FROM menu_view_daily mv
    JOIN branches b ON b.id = mv.branch_id
    WHERE b.restaurant_id = ${restaurantId} AND mv.day BETWEEN ${fromDay} AND ${toDay} AND mv.display_mode = 'standalone'
  `);

  return {
    loads: toNumber(totals?.loads),
    ephemeralVisits: toNumber(totals?.visits),
    qrLoads: toNumber(qr?.loads),
    standaloneLoads: toNumber(standalone?.loads),
  };
}

export async function getLoadsByLanguage(input: RestaurantAnalyticsPeriodInput): Promise<LanguageShare[]> {
  const { db, fromDay, restaurantId, toDay } = input;
  const rows = await db.all<{ language_code: string; loads: number }>(sql`
    SELECT mv.language_code, SUM(mv.views) AS loads
    FROM menu_view_daily mv
    JOIN branches b ON b.id = mv.branch_id
    WHERE b.restaurant_id = ${restaurantId} AND mv.day BETWEEN ${fromDay} AND ${toDay}
    GROUP BY mv.language_code
    ORDER BY loads DESC
  `);

  return rows.map((row) => ({ code: row.language_code, loads: toNumber(row.loads) }));
}

export async function getLoadsByBranch(input: RestaurantAnalyticsPeriodInput): Promise<BranchShare[]> {
  const { db, fromDay, restaurantId, toDay } = input;
  const rows = await db.all<{ branch_id: string; loads: number; name: string }>(sql`
    SELECT mv.branch_id, b.name, SUM(mv.views) AS loads
    FROM menu_view_daily mv
    JOIN branches b ON b.id = mv.branch_id
    WHERE b.restaurant_id = ${restaurantId} AND mv.day BETWEEN ${fromDay} AND ${toDay}
    GROUP BY mv.branch_id, b.name
    ORDER BY loads DESC
  `);

  return rows.map((row) => ({ branchId: row.branch_id, loads: toNumber(row.loads), name: row.name }));
}

export async function getHourlyLoads(input: RestaurantAnalyticsPeriodInput): Promise<HourLoad[]> {
  const { db, fromDay, restaurantId, toDay } = input;
  const rows = await db.all<{ hour: number; loads: number }>(sql`
    SELECT h.hour, SUM(h.loads) AS loads
    FROM hourly_activity_daily h
    JOIN branches b ON b.id = h.branch_id
    WHERE b.restaurant_id = ${restaurantId} AND h.day BETWEEN ${fromDay} AND ${toDay}
    GROUP BY h.hour
    ORDER BY h.hour
  `);

  return rows.map((row) => ({ hour: Number(row.hour), loads: toNumber(row.loads) }));
}

export async function getDishSummary(input: RestaurantAnalyticsPeriodInput, limit: number): Promise<DishSummary> {
  const { db, fromDay, restaurantId, toDay } = input;
  const rows = await db.all<{
    dish_id: string;
    name: string;
    opens: number;
    total_opens: number;
    visits_with_open: number;
  }>(sql`
    WITH dish_totals AS (
      SELECT dv.dish_id, d.name, SUM(dv.views) AS opens, SUM(dv.visits_with_open) AS visits_with_open
      FROM dish_view_daily dv
      JOIN branches b ON b.id = dv.branch_id
      JOIN dishes d ON d.id = dv.dish_id
      WHERE b.restaurant_id = ${restaurantId} AND dv.day BETWEEN ${fromDay} AND ${toDay}
      GROUP BY dv.dish_id, d.name
    )
    SELECT dish_id, name, opens, visits_with_open, SUM(opens) OVER () AS total_opens
    FROM dish_totals
    ORDER BY opens DESC
    LIMIT ${limit}
  `);

  return {
    totalOpens: toNumber(rows[0]?.total_opens),
    topDishes: rows.map((row) => ({
      dishId: row.dish_id,
      name: row.name,
      opens: toNumber(row.opens),
      visitsWithOpen: toNumber(row.visits_with_open),
    })),
  };
}

export async function getDishSourceSplit(input: RestaurantAnalyticsPeriodInput): Promise<SourceSplit> {
  const { db, fromDay, restaurantId, toDay } = input;
  const rows = await db.all<{ source: string; opens: number }>(sql`
    SELECT dv.source, SUM(dv.views) AS opens
    FROM dish_view_daily dv
    JOIN branches b ON b.id = dv.branch_id
    WHERE b.restaurant_id = ${restaurantId} AND dv.day BETWEEN ${fromDay} AND ${toDay}
      AND dv.source IN ('featured', 'section')
    GROUP BY dv.source
  `);

  const featured = rows.find((row) => row.source === "featured");

  return {
    featuredOpens: toNumber(featured?.opens),
    sectionOpens: rows
      .filter((row) => row.source !== "featured")
      .reduce((total, row) => total + toNumber(row.opens), 0),
  };
}

export async function getCategoryTotals(input: RestaurantAnalyticsPeriodInput): Promise<CategoryTotals> {
  const { db, fromDay, restaurantId, toDay } = input;
  const [row] = await db.all<{ reached: number; selected: number; max_depth: number | null }>(sql`
    SELECT SUM(c.reached_count) AS reached, SUM(c.selected_count) AS selected, MAX(c.max_position) AS max_depth
    FROM category_activity_daily c
    JOIN branches b ON b.id = c.branch_id
    WHERE b.restaurant_id = ${restaurantId} AND c.day BETWEEN ${fromDay} AND ${toDay}
  `);

  return {
    reachedCount: toNumber(row?.reached),
    selectedCount: toNumber(row?.selected),
    maxDepthPosition: toNullableNumber(row?.max_depth),
  };
}

export async function getPromotionSummary(
  input: RestaurantAnalyticsPeriodInput,
  limit: number,
): Promise<PromotionSummary> {
  const { db, fromDay, restaurantId, toDay } = input;
  const rows = await db.all<{
    promotion_id: string;
    promotion_name: string | null;
    open_count: number;
    total_opens: number;
  }>(sql`
    WITH promotion_totals AS (
      SELECT p.promotion_id, MAX(p.promotion_name) AS promotion_name, SUM(p.open_count) AS open_count
      FROM promotion_open_daily p
      WHERE p.restaurant_id = ${restaurantId} AND p.day BETWEEN ${fromDay} AND ${toDay}
      GROUP BY p.promotion_id
    )
    SELECT promotion_id, promotion_name, open_count, SUM(open_count) OVER () AS total_opens
    FROM promotion_totals
    ORDER BY open_count DESC
    LIMIT ${limit}
  `);

  return {
    topPromotions: rows.map((row) => ({
      openCount: toNumber(row.open_count),
      promotionId: row.promotion_id,
      promotionName: row.promotion_name,
    })),
    totalOpens: toNumber(rows[0]?.total_opens),
  };
}

export async function getContactChannelTotals(input: RestaurantAnalyticsPeriodInput): Promise<ChannelTotals> {
  const { db, fromDay, restaurantId, toDay } = input;
  const rows = await db.all<{ channel: string; actions: number }>(sql`
    SELECT ca.channel, SUM(ca.action_count) AS actions
    FROM contact_action_daily ca
    JOIN branches b ON b.id = ca.branch_id
    WHERE b.restaurant_id = ${restaurantId} AND ca.day BETWEEN ${fromDay} AND ${toDay}
    GROUP BY ca.channel
  `);

  const find = (channel: string): number => toNumber(rows.find((row) => row.channel === channel)?.actions);

  return { map: find("map"), phone: find("phone"), social: find("social"), whatsapp: find("whatsapp") };
}

/** Contadores planos evento→total (contact_view, pwa_*, offline_*, qr_visit…). */
export async function getEventCounterTotals(input: RestaurantAnalyticsPeriodInput): Promise<Map<string, number>> {
  const { db, fromDay, restaurantId, toDay } = input;
  const rows = await db.all<{ event_code: string; count: number }>(sql`
    SELECT e.event_code, SUM(e.count) AS count
    FROM event_counter_daily e
    JOIN branches b ON b.id = e.branch_id
    WHERE b.restaurant_id = ${restaurantId} AND e.day BETWEEN ${fromDay} AND ${toDay}
    GROUP BY e.event_code
  `);

  return new Map(rows.map((row) => [row.event_code, toNumber(row.count)]));
}

export interface LoyaltyPeriodMetrics {
  visitors: number;
  repeaters: number;
  /** Mediana de días entre visitas consecutivas dentro del periodo; null sin pares suficientes. */
  medianDaysBetweenVisits: number | null;
  /** Visitas con visita prevista anterior; denominador de recurrence30d excluye primeras visitas absolutas. */
  visitsWithPrevious: number;
  /** De las anteriores, cuántas se repitieron en ≤ 30 días. */
  returnsWithin30Days: number;
}

interface LoyaltyPeriodInput {
  db: DrizzleDb;
  fromMs: number;
  restaurantId: string;
  toMs: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getLoyaltyVisitors(input: LoyaltyPeriodInput): Promise<LoyaltyPeriodMetrics> {
  const { db, fromMs, restaurantId, toMs } = input;
  const [visitorsRow] = await db.all<{ repeaters: number; visitors: number }>(sql`
    SELECT COUNT(*) AS visitors, SUM(CASE WHEN n >= 2 THEN 1 ELSE 0 END) AS repeaters
    FROM (
      SELECT customer_id, COUNT(*) AS n
      FROM customer_visits
      WHERE restaurant_id = ${restaurantId} AND created_at BETWEEN ${fromMs} AND ${toMs}
      GROUP BY customer_id
    )
  `);
  const [medianRow] = await db.all<{ median_gap_days: number | null }>(sql`
    WITH ordered AS (
      SELECT customer_id, created_at,
             LAG(created_at) OVER (PARTITION BY customer_id ORDER BY created_at) AS previous_at
      FROM customer_visits
      WHERE restaurant_id = ${restaurantId} AND created_at BETWEEN ${fromMs} AND ${toMs}
    ), gaps AS (
      SELECT (created_at - previous_at) * 1.0 / ${DAY_MS} AS gap_days
      FROM ordered
      WHERE previous_at IS NOT NULL
    ), ranked AS (
      SELECT gap_days, ROW_NUMBER() OVER (ORDER BY gap_days) AS rn, COUNT(*) OVER () AS total
      FROM gaps
    )
    SELECT AVG(gap_days) AS median_gap_days FROM ranked WHERE rn IN ((total + 1) / 2, (total + 2) / 2)
  `);
  const [recurrenceRow] = await db.all<{ within_30: number; with_previous: number }>(sql`
    WITH history AS (
      SELECT customer_id, created_at,
             LAG(created_at) OVER (PARTITION BY customer_id ORDER BY created_at) AS previous_at
      FROM customer_visits
      WHERE restaurant_id = ${restaurantId} AND created_at <= ${toMs}
    )
    SELECT
      SUM(CASE WHEN previous_at IS NOT NULL THEN 1 ELSE 0 END) AS with_previous,
      SUM(CASE WHEN previous_at IS NOT NULL AND (created_at - previous_at) <= ${30 * DAY_MS} THEN 1 ELSE 0 END) AS within_30
    FROM history
    WHERE created_at >= ${fromMs}
  `);

  return {
    visitors: toNumber(visitorsRow?.visitors),
    repeaters: toNumber(visitorsRow?.repeaters),
    medianDaysBetweenVisits: toNullableNumber(medianRow?.median_gap_days),
    visitsWithPrevious: toNumber(recurrenceRow?.with_previous),
    returnsWithin30Days: toNumber(recurrenceRow?.within_30),
  };
}

export interface CardsSummary {
  total: number;
  /** Con al menos una visita en los últimos 30 días respecto al fin del periodo. */
  activeLast30Days: number;
  stampsBalanceTotal: number;
}

interface CardsSummaryInput {
  activeCutoffMs: number;
  db: DrizzleDb;
  restaurantId: string;
}

export async function getCardsSummary({ activeCutoffMs, db, restaurantId }: CardsSummaryInput): Promise<CardsSummary> {
  const [row] = await db.all<{ active_last_30: number; stamps_total: number; total: number }>(sql`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN last_visit_at IS NOT NULL AND last_visit_at >= ${activeCutoffMs} THEN 1 ELSE 0 END) AS active_last_30,
      SUM(stamps_balance) AS stamps_total
    FROM customer_restaurants
    WHERE restaurant_id = ${restaurantId}
  `);

  return {
    total: toNumber(row?.total),
    activeLast30Days: toNumber(row?.active_last_30),
    stampsBalanceTotal: toNumber(row?.stamps_total),
  };
}

export interface RewardsStatusCounts {
  expired: number;
  pending: number;
  rejected: number;
  requested: number;
  validated: number;
}

export interface RewardReturnRow {
  cost: number;
  dishPrice: number | null;
  percentage: number | null;
  specialPrice: number | null;
  type: "free_dish" | "percentage_discount" | "special_price";
  validatedAt: number;
}

export async function getRedemptionStatusCounts(input: LoyaltyPeriodInput): Promise<RewardsStatusCounts> {
  const { db, fromMs, restaurantId, toMs } = input;
  const [row] = await db.all<{
    expired: number;
    pending: number;
    rejected: number;
    requested: number;
    validated: number;
  }>(sql`
    SELECT
      COUNT(*) AS requested,
      SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) AS expired,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
      (
        SELECT COUNT(*)
        FROM loyalty_redemptions validated
        WHERE validated.restaurant_id = ${restaurantId}
          AND validated.status = 'validated'
          AND validated.validated_at BETWEEN ${fromMs} AND ${toMs}
      ) AS validated
    FROM loyalty_redemptions requested
    WHERE requested.restaurant_id = ${restaurantId} AND requested.created_at BETWEEN ${fromMs} AND ${toMs}
  `);

  return {
    expired: toNumber(row?.expired),
    pending: toNumber(row?.pending),
    rejected: toNumber(row?.rejected),
    requested: toNumber(row?.requested),
    validated: toNumber(row?.validated),
  };
}

/** Filas para el coste estimado de premios validados en el periodo (misma fórmula que loyalty insights). */
export async function listValidatedRedemptionsInPeriod(input: LoyaltyPeriodInput): Promise<RewardReturnRow[]> {
  const { db, fromMs, restaurantId, toMs } = input;
  const rows = await db.all<{
    cost: number;
    dish_price: number | null;
    percentage: number | null;
    special_price: number | null;
    type: string;
    validated_at: number;
  }>(sql`
    SELECT r.cost, r.validated_at, rw.type, rw.percentage, rw.special_price, d.price AS dish_price
    FROM loyalty_redemptions r
    JOIN loyalty_rewards rw ON rw.id = r.reward_id
    LEFT JOIN dishes d ON d.id = rw.free_dish_id
    WHERE r.restaurant_id = ${restaurantId} AND r.status = 'validated' AND r.validated_at BETWEEN ${fromMs} AND ${toMs}
  `);

  return rows.map((row) => ({
    validatedAt: Number(row.validated_at),
    cost: toNumber(row.cost),
    type: row.type as RewardReturnRow["type"],
    percentage: toNullableNumber(row.percentage),
    specialPrice: toNullableNumber(row.special_price),
    dishPrice: toNullableNumber(row.dish_price),
  }));
}

/** Mediana de horas desde el alta de la tarjeta hasta la validación del primer premio. */
export async function getMedianHoursToFirstReward(
  input: Omit<LoyaltyPeriodInput, "fromMs"> & { fromMs: number },
): Promise<number | null> {
  const { db, fromMs, restaurantId, toMs } = input;
  const [row] = await db.all<{ median_hours: number | null }>(sql`
    WITH first_rewards AS (
      SELECT r.customer_id, MIN(r.validated_at) AS first_validated_at
      FROM loyalty_redemptions r
      WHERE r.restaurant_id = ${restaurantId} AND r.status = 'validated' AND r.validated_at IS NOT NULL
      GROUP BY r.customer_id
      HAVING MIN(r.validated_at) BETWEEN ${fromMs} AND ${toMs}
    ), elapsed AS (
      SELECT (fr.first_validated_at - cr.created_at) * 1.0 / 3600000 AS hours
      FROM first_rewards fr
      JOIN customer_restaurants cr ON cr.customer_id = fr.customer_id AND cr.restaurant_id = ${restaurantId}
      WHERE cr.created_at IS NOT NULL
    ), ranked AS (
      SELECT hours, ROW_NUMBER() OVER (ORDER BY hours) AS rn, COUNT(*) OVER () AS total
      FROM elapsed
      WHERE hours >= 0
    )
    SELECT AVG(hours) AS median_hours FROM ranked WHERE rn IN ((total + 1) / 2, (total + 2) / 2)
  `);

  return toNullableNumber(row?.median_hours);
}
