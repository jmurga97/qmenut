import { runHogQLQuery } from "./posthog.client";

import type { RuntimeEnv } from "@/config/env/schema";

/**
 * Consultas HogQL de agregación por familia. Todos los grupos incluyen el día local del
 * restaurante (`properties.analytics_day`), que es la dimensión temporal autoritativa: la
 * zona horaria se aplica en el cliente, no en el servidor de PostHog.
 *
 * Los eventos históricos sin IDs estables (categorías/promociones) siguen contando en
 * totales bajo claves `legacy:<nombre>`; no se intenta unir traducciones ambiguas.
 */

const TENANT_SCOPE = "properties.branch_id IS NOT NULL AND properties.restaurant_id IS NOT NULL";

function eventWindow(fromDay: string, toDay: string): string {
  // fromDay/toDay se generan internamente con formato YYYY-MM-DD validado.
  return `properties.analytics_day >= '${fromDay}' AND properties.analytics_day <= '${toDay}'`;
}

export interface MenuLoadRow {
  branchId: string;
  restaurantId: string;
  day: string;
  languageCode: string;
  source: string;
  displayMode: string;
  loads: number;
  visits: number;
}

export interface DishOpenRow {
  dishId: string;
  branchId: string;
  restaurantId: string;
  day: string;
  languageCode: string;
  source: string;
  opens: number;
  visitsWithOpen: number;
}

export interface CategoryActivityRow {
  branchId: string;
  restaurantId: string;
  day: string;
  languageCode: string;
  categoryKey: string;
  categoryLabel: string | null;
  reachedCount: number;
  selectedCount: number;
  maxPosition: number | null;
}

export interface PromotionOpenRow {
  branchId: string;
  restaurantId: string;
  day: string;
  languageCode: string;
  promotionKey: string;
  promotionName: string | null;
  openCount: number;
}

export interface EventCounterRow {
  branchId: string;
  restaurantId: string;
  day: string;
  eventCode: string;
  count: number;
}

export interface ContactActionRow {
  branchId: string;
  restaurantId: string;
  day: string;
  languageCode: string;
  channel: string;
  actionCount: number;
}

export interface HourlyActivityRow {
  branchId: string;
  restaurantId: string;
  day: string;
  hour: number;
  loads: number;
}

const COUNTER_EVENT_CODES = [
  "contact_view",
  "highlights_view",
  "language_changed",
  "loyalty_view",
  "offline_retry_clicked",
  "offline_view",
  "pwa_install_card_dismissed",
  "pwa_install_card_shown",
  "pwa_install_prompt_accepted",
  "pwa_install_prompt_dismissed",
  "pwa_installed",
  "qr_visit",
] as const;

function toFiniteNumber(value: unknown): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function toNullableNumber(value: unknown): number | null {
  switch (value) {
    case null:
    case undefined:
    case "":
      return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function toDayString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toDimension(value: unknown, fallback: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    return fallback;
  }

  return value.slice(0, 120);
}

interface FetchRangeInput {
  env: RuntimeEnv;
  fromDay: string;
  toDay: string;
}

export async function fetchMenuLoads({ env, fromDay, toDay }: FetchRangeInput): Promise<MenuLoadRow[]> {
  const result = await runHogQLQuery(env, {
    query: `
      SELECT
        properties.branch_id AS branch_id,
        properties.restaurant_id AS restaurant_id,
        properties.analytics_day AS day,
        coalesce(nullIf(properties.locale, ''), 'all') AS language_code,
        if(properties.from_qr = 'true' or properties.from_qr = 1 or properties.from_qr = '1', 'qr', 'other') AS source,
        coalesce(nullIf(properties.display_mode, ''), 'legacy') AS display_mode,
        count() AS loads,
        uniqExact(nullIf(properties.analytics_visit_id, '')) AS visits
      FROM events
      WHERE event = 'menu_view' AND ${TENANT_SCOPE} AND ${eventWindow(fromDay, toDay)}
      GROUP BY branch_id, restaurant_id, day, language_code, source, display_mode
    `,
    expectedColumns: [
      "branch_id",
      "restaurant_id",
      "day",
      "language_code",
      "source",
      "display_mode",
      "loads",
      "visits",
    ],
  });

  return result.rows.map((row) => ({
    branchId: String(row.branch_id),
    restaurantId: String(row.restaurant_id),
    day: toDayString(row.day),
    languageCode: toDimension(row.language_code, "all"),
    source: row.source === "qr" ? "qr" : "other",
    displayMode: toDimension(row.display_mode, "legacy"),
    loads: toFiniteNumber(row.loads),
    visits: toFiniteNumber(row.visits),
  }));
}

export async function fetchDishOpens({ env, fromDay, toDay }: FetchRangeInput): Promise<DishOpenRow[]> {
  const result = await runHogQLQuery(env, {
    query: `
      SELECT
        properties.dish_id AS dish_id,
        properties.branch_id AS branch_id,
        properties.restaurant_id AS restaurant_id,
        properties.analytics_day AS day,
        coalesce(nullIf(properties.locale, ''), 'legacy') AS language_code,
        coalesce(nullIf(properties.source, ''), 'section') AS source,
        count() AS opens,
        uniqExact(nullIf(properties.analytics_visit_id, '')) AS visits_with_open
      FROM events
      WHERE event = 'dish_opened' AND ${TENANT_SCOPE} AND ${eventWindow(fromDay, toDay)}
      GROUP BY dish_id, branch_id, restaurant_id, day, language_code, source
    `,
    expectedColumns: [
      "dish_id",
      "branch_id",
      "restaurant_id",
      "day",
      "language_code",
      "source",
      "opens",
      "visits_with_open",
    ],
  });

  return result.rows.map((row) => ({
    dishId: String(row.dish_id),
    branchId: String(row.branch_id),
    restaurantId: String(row.restaurant_id),
    day: toDayString(row.day),
    languageCode: toDimension(row.language_code, "legacy"),
    source: row.source === "featured" ? "featured" : "section",
    opens: toFiniteNumber(row.opens),
    visitsWithOpen: toFiniteNumber(row.visits_with_open),
  }));
}

export async function fetchCategoryActivity({ env, fromDay, toDay }: FetchRangeInput): Promise<CategoryActivityRow[]> {
  const result = await runHogQLQuery(env, {
    query: `
      SELECT
        properties.branch_id AS branch_id,
        properties.restaurant_id AS restaurant_id,
        properties.analytics_day AS day,
        coalesce(nullIf(properties.locale, ''), 'all') AS language_code,
        coalesce(
          nullIf(properties.category_id, ''),
          concat('legacy:', lower(coalesce(properties.category, 'desconocida')))
        ) AS category_key,
        max(properties.category) AS category_label,
        countIf(event = 'menu_category_reached') AS reached_count,
        countIf(event = 'menu_category_selected') AS selected_count,
        maxIf(toFloat(properties.position), event = 'menu_category_reached') AS max_position
      FROM events
      WHERE event IN ('menu_category_reached', 'menu_category_selected')
        AND ${TENANT_SCOPE}
        AND ${eventWindow(fromDay, toDay)}
      GROUP BY branch_id, restaurant_id, day, language_code, category_key
    `,
    expectedColumns: [
      "branch_id",
      "restaurant_id",
      "day",
      "language_code",
      "category_key",
      "category_label",
      "reached_count",
      "selected_count",
      "max_position",
    ],
  });

  return result.rows.map((row) => ({
    branchId: String(row.branch_id),
    restaurantId: String(row.restaurant_id),
    day: toDayString(row.day),
    languageCode: toDimension(row.language_code, "all"),
    categoryKey: toDimension(row.category_key, "legacy:desconocida"),
    categoryLabel: typeof row.category_label === "string" && row.category_label !== "" ? row.category_label : null,
    reachedCount: toFiniteNumber(row.reached_count),
    selectedCount: toFiniteNumber(row.selected_count),
    maxPosition: toNullableNumber(row.max_position),
  }));
}

export async function fetchPromotionOpens({ env, fromDay, toDay }: FetchRangeInput): Promise<PromotionOpenRow[]> {
  const result = await runHogQLQuery(env, {
    query: `
      SELECT
        properties.branch_id AS branch_id,
        properties.restaurant_id AS restaurant_id,
        properties.analytics_day AS day,
        coalesce(nullIf(properties.locale, ''), 'all') AS language_code,
        coalesce(
          nullIf(properties.promotion_id, ''),
          concat('legacy:', lower(coalesce(properties.name, 'desconocida')))
        ) AS promotion_key,
        max(properties.name) AS promotion_name,
        count() AS open_count
      FROM events
      WHERE event = 'promo_opened' AND ${TENANT_SCOPE} AND ${eventWindow(fromDay, toDay)}
      GROUP BY branch_id, restaurant_id, day, language_code, promotion_key
    `,
    expectedColumns: [
      "branch_id",
      "restaurant_id",
      "day",
      "language_code",
      "promotion_key",
      "promotion_name",
      "open_count",
    ],
  });

  return result.rows.map((row) => ({
    branchId: String(row.branch_id),
    restaurantId: String(row.restaurant_id),
    day: toDayString(row.day),
    languageCode: toDimension(row.language_code, "all"),
    promotionKey: toDimension(row.promotion_key, "legacy:desconocida"),
    promotionName: typeof row.promotion_name === "string" && row.promotion_name !== "" ? row.promotion_name : null,
    openCount: toFiniteNumber(row.open_count),
  }));
}

export async function fetchEventCounters({ env, fromDay, toDay }: FetchRangeInput): Promise<EventCounterRow[]> {
  const eventList = COUNTER_EVENT_CODES.map((code) => `'${code}'`).join(", ");
  const result = await runHogQLQuery(env, {
    query: `
      SELECT
        properties.branch_id AS branch_id,
        properties.restaurant_id AS restaurant_id,
        properties.analytics_day AS day,
        event AS event_code,
        count() AS total
      FROM events
      WHERE event IN (${eventList}) AND ${TENANT_SCOPE} AND ${eventWindow(fromDay, toDay)}
      GROUP BY branch_id, restaurant_id, day, event_code
    `,
    expectedColumns: ["branch_id", "restaurant_id", "day", "event_code", "total"],
  });

  return result.rows
    .map((row) => ({
      branchId: String(row.branch_id),
      restaurantId: String(row.restaurant_id),
      day: toDayString(row.day),
      eventCode: String(row.event_code),
      count: toFiniteNumber(row.total),
    }))
    .filter((row) => (COUNTER_EVENT_CODES as readonly string[]).includes(row.eventCode));
}

export async function fetchContactActions({ env, fromDay, toDay }: FetchRangeInput): Promise<ContactActionRow[]> {
  const result = await runHogQLQuery(env, {
    query: `
      SELECT
        properties.branch_id AS branch_id,
        properties.restaurant_id AS restaurant_id,
        properties.analytics_day AS day,
        coalesce(nullIf(properties.locale, ''), 'all') AS language_code,
        properties.channel AS channel,
        count() AS action_count
      FROM events
      WHERE event = 'contact_action_tapped' AND ${TENANT_SCOPE} AND ${eventWindow(fromDay, toDay)}
      GROUP BY branch_id, restaurant_id, day, language_code, channel
    `,
    expectedColumns: ["branch_id", "restaurant_id", "day", "language_code", "channel", "action_count"],
  });

  const channels = new Set(["map", "phone", "social", "whatsapp"]);

  return result.rows
    .map((row) => ({
      branchId: String(row.branch_id),
      restaurantId: String(row.restaurant_id),
      day: toDayString(row.day),
      languageCode: toDimension(row.language_code, "all"),
      channel: String(row.channel),
      actionCount: toFiniteNumber(row.action_count),
    }))
    .filter((row) => channels.has(row.channel));
}

export async function fetchHourlyActivity({ env, fromDay, toDay }: FetchRangeInput): Promise<HourlyActivityRow[]> {
  const result = await runHogQLQuery(env, {
    query: `
      SELECT
        properties.branch_id AS branch_id,
        properties.restaurant_id AS restaurant_id,
        properties.analytics_day AS day,
        toInt(properties.analytics_hour) AS hour,
        count() AS loads
      FROM events
      WHERE event = 'menu_view' AND ${TENANT_SCOPE} AND ${eventWindow(fromDay, toDay)}
        AND isNotNull(properties.analytics_hour)
      GROUP BY branch_id, restaurant_id, day, hour
    `,
    expectedColumns: ["branch_id", "restaurant_id", "day", "hour", "loads"],
  });

  return result.rows
    .map((row) => ({
      branchId: String(row.branch_id),
      restaurantId: String(row.restaurant_id),
      day: toDayString(row.day),
      hour: toNullableNumber(row.hour) ?? -1,
      loads: toFiniteNumber(row.loads),
    }))
    .filter((row) => row.hour >= 0 && row.hour <= 23);
}
