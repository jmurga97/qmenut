import { sql } from "drizzle-orm";
import { check, index, integer, primaryKey, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

import { users } from "./auth";
import { branches } from "./branches";
import { dishes } from "./menu";
import { restaurants } from "./restaurants";

const epochMilliseconds = sql`(unixepoch() * 1000)`;

/**
 * Agregados diarios materializados desde PostHog (comportamiento anónimo de la carta) y
 * consultados por el servicio de snapshots para el resumen quincenal. Cada día se sustituye
 * atómicamente con totales absolutos: repetir la sincronización es idempotente.
 *
 * Las dimensiones nuevas añadidas sobre las tablas originales usan el valor por defecto
 * `legacy`, de modo que los datos históricos previos a la ampliación sobrevivan a la
 * recreación de tablas sin intentar reconstruir dimensiones desconocidas.
 */

/** Cargas de carta y visitas efímeras por sucursal, día, idioma, origen (`qr`|`other`) y modo. */
export const menuViewDaily = sqliteTable(
  "menu_view_daily",
  {
    branchId: text("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    languageCode: text("language_code").notNull().default("all"),
    source: text("source").notNull().default("all"),
    views: integer("views").notNull().default(0),
    visits: integer("visits").notNull().default(0),
    displayMode: text("display_mode").notNull().default("legacy"),
  },
  (table) => [
    primaryKey({
      columns: [table.branchId, table.day, table.languageCode, table.source, table.displayMode],
    }),
    check("menu_view_daily_views", sql`${table.views} >= 0`),
    check("menu_view_daily_visits", sql`${table.visits} >= 0`),
  ],
);

/** Aperturas de plato por plato, sucursal, día, idioma y origen (`featured`|`section`). */
export const dishViewDaily = sqliteTable(
  "dish_view_daily",
  {
    dishId: text("dish_id")
      .notNull()
      .references(() => dishes.id, { onDelete: "cascade" }),
    branchId: text("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    views: integer("views").notNull().default(0),
    languageCode: text("language_code").notNull().default("legacy"),
    source: text("source").notNull().default("legacy"),
    visitsWithOpen: integer("visits_with_open").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.dishId, table.branchId, table.day, table.languageCode, table.source] }),
    index("idx_dish_view_daily_branch").on(table.branchId, table.day),
    check("dish_view_daily_views", sql`${table.views} >= 0`),
    check("dish_view_daily_visits_with_open", sql`${table.visitsWithOpen} >= 0`),
  ],
);

/**
 * Categorías alcanzadas (scroll) y seleccionadas (chip). `max_position` de la categoría más
 * profunda del periodo equivale a la profundidad máxima de navegación. `category_label` es
 * solo diagnóstico; la clave estable es `category_id`.
 */
export const categoryActivityDaily = sqliteTable(
  "category_activity_daily",
  {
    branchId: text("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    languageCode: text("language_code").notNull().default("all"),
    categoryId: text("category_id").notNull(),
    categoryLabel: text("category_label"),
    reachedCount: integer("reached_count").notNull().default(0),
    selectedCount: integer("selected_count").notNull().default(0),
    maxPosition: integer("max_position"),
  },
  (table) => [
    primaryKey({ columns: [table.branchId, table.day, table.languageCode, table.categoryId] }),
    check("category_activity_daily_reached", sql`${table.reachedCount} >= 0`),
    check("category_activity_daily_selected", sql`${table.selectedCount} >= 0`),
  ],
);

/**
 * Aperturas de promoción por ID estable. Los eventos históricos sin `promotion_id` se guardan
 * con la clave `legacy:<nombre>` por idioma, sin unir traducciones ambiguas.
 */
export const promotionOpenDaily = sqliteTable(
  "promotion_open_daily",
  {
    restaurantId: text("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    languageCode: text("language_code").notNull().default("all"),
    promotionId: text("promotion_id").notNull(),
    promotionName: text("promotion_name"),
    openCount: integer("open_count").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.restaurantId, table.day, table.languageCode, table.promotionId] }),
    check("promotion_open_daily_count", sql`${table.openCount} >= 0`),
  ],
);

/** Acciones de contacto por canal (`map`|`phone`|`social`|`whatsapp`). */
export const contactActionDaily = sqliteTable(
  "contact_action_daily",
  {
    branchId: text("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    languageCode: text("language_code").notNull().default("all"),
    channel: text("channel").notNull(),
    actionCount: integer("action_count").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.branchId, table.day, table.languageCode, table.channel] }),
    check("contact_action_daily_channel", sql`${table.channel} IN ('map', 'phone', 'social', 'whatsapp')`),
    check("contact_action_daily_count", sql`${table.actionCount} >= 0`),
  ],
);

/** Contadores diarios de eventos sueltos: navegación, contacto, PWA, offline y QR. */
export const eventCounterDaily = sqliteTable(
  "event_counter_daily",
  {
    branchId: text("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    eventCode: text("event_code").notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.branchId, table.day, table.eventCode] }),
    check("event_counter_daily_count", sql`${table.count} >= 0`),
  ],
);

/** Actividad horaria por sucursal: cargas de carta en cada hora local del restaurante. */
export const hourlyActivityDaily = sqliteTable(
  "hourly_activity_daily",
  {
    branchId: text("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    hour: integer("hour").notNull(),
    loads: integer("loads").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.branchId, table.day, table.hour] }),
    check("hourly_activity_daily_hour", sql`${table.hour} BETWEEN 0 AND 23`),
    check("hourly_activity_daily_loads", sql`${table.loads} >= 0`),
  ],
);

/** Estado de las sincronizaciones PostHog → D1. Una fila por scope conocido. */
export const analyticsSyncState = sqliteTable(
  "analytics_sync_state",
  {
    scope: text("scope").primaryKey(),
    backfillCompletedAt: integer("backfill_completed_at"),
    lastSuccessfulDay: text("last_successful_day"),
    lastRunAt: integer("last_run_at"),
    lastSuccessAt: integer("last_success_at"),
    lastErrorCode: text("last_error_code"),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
  },
  (table) => [check("analytics_sync_state_scope", sql`${table.scope} = 'posthog'`)],
);

/** Calendario del digest quincenal: fila única con el ancla del último periodo cerrado. */
export const digestSchedule = sqliteTable(
  "digest_schedule",
  {
    id: integer("id").primaryKey(),
    anchorEndDay: text("anchor_end_day"),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
  },
  (table) => [check("digest_schedule_singleton", sql`${table.id} = 1`)],
);

/**
 * Entregas del digest por destinatario. La clave única restaurante–usuario–periodo evita
 * duplicados entre ejecuciones; nunca se guardan direcciones de correo ni cuerpos.
 */
export const digestDeliveries = sqliteTable(
  "digest_deliveries",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    periodStartDay: text("period_start_day").notNull(),
    periodEndDay: text("period_end_day").notNull(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastErrorCode: text("last_error_code"),
    leaseExpiresAt: integer("lease_expires_at"),
    sentAt: integer("sent_at"),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
  },
  (table) => [
    unique("ux_digest_deliveries_recipient_period").on(table.restaurantId, table.userId, table.periodEndDay),
    index("idx_digest_deliveries_status").on(table.status, table.leaseExpiresAt),
    check("digest_deliveries_status", sql`${table.status} IN ('pending', 'sending', 'sent', 'failed')`),
    check("digest_deliveries_attempts", sql`${table.attempts} >= 0`),
  ],
);
