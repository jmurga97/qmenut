import { sql } from "drizzle-orm";
import { check, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { branches } from "./branches";
import { restaurants, restaurantUsers } from "./restaurants";

const epochMilliseconds = sql`(unixepoch() * 1000)`;

/** One row per branch, created when the restaurant first saves its reservation settings. */
export const reservationSettings = sqliteTable(
  "reservation_settings",
  {
    branchId: text("branch_id")
      .primaryKey()
      .references(() => branches.id, { onDelete: "cascade" }),
    restaurantId: text("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(false),
    // Tables per slot; one reservation takes one table whatever the party size.
    slotCapacity: integer("slot_capacity").notNull(),
    onlinePartyLimit: integer("online_party_limit").notNull().default(8),
    windowDays: integer("window_days").notNull().default(30),
    leadTimeMinutes: integer("lead_time_minutes").notNull().default(120),
    // When the reminder email goes out, before the slot.
    checkBeforeMinutes: integer("check_before_minutes").notNull().default(1440),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
  },
  (table) => [
    check("reservation_settings_capacity", sql`${table.slotCapacity} >= 1`),
    check("reservation_settings_party_limit", sql`${table.onlinePartyLimit} >= 1`),
  ],
);

/** Weekly slot starts in the restaurant's local time. */
export const reservationSlots = sqliteTable(
  "reservation_slots",
  {
    branchId: text("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(),
    startMinute: integer("start_minute").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.branchId, table.weekday, table.startMinute] }),
    check("reservation_slots_weekday", sql`${table.weekday} BETWEEN 0 AND 6`),
    check("reservation_slots_start_minute", sql`${table.startMinute} BETWEEN 0 AND 1439`),
  ],
);

export const reservationClosures = sqliteTable(
  "reservation_closures",
  {
    id: text("id").primaryKey(),
    branchId: text("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    // Local YYYY-MM-DD.
    date: text("date").notNull(),
    // Null closes the whole day.
    startMinute: integer("start_minute"),
    createdBy: text("created_by").references(() => restaurantUsers.id, { onDelete: "set null" }),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
  },
  (table) => [
    // NULLs are distinct in a unique index, so whole-day closures get their own.
    uniqueIndex("ux_reservation_closures_slot")
      .on(table.branchId, table.date, table.startMinute)
      .where(sql`${table.startMinute} IS NOT NULL`),
    uniqueIndex("ux_reservation_closures_day")
      .on(table.branchId, table.date)
      .where(sql`${table.startMinute} IS NULL`),
  ],
);

export const reservations = sqliteTable(
  "reservations",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    branchId: text("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    slotDate: text("slot_date").notNull(),
    slotMinute: integer("slot_minute").notNull(),
    // UTC, computed from the restaurant's timezone at booking time.
    startsAt: integer("starts_at").notNull(),
    partySize: integer("party_size").notNull(),
    // Nulled by the 90-day anonymization.
    guestName: text("guest_name"),
    guestPhone: text("guest_phone"),
    guestEmail: text("guest_email"),
    guestLanguage: text("guest_language").notNull(),
    // ADR 0008: booked as pending (not confirmed by the guest yet); both pending and confirmed hold a table.
    status: text("status", { enum: ["pending", "confirmed", "cancelled"] })
      .notNull()
      .default("pending"),
    cancelledBy: text("cancelled_by", { enum: ["guest", "staff"] }),
    // When the reminder email was claimed for sending.
    checkSentAt: integer("check_sent_at"),
    consentAt: integer("consent_at").notNull(),
    anonymizedAt: integer("anonymized_at"),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
  },
  (table) => [
    index("idx_reservations_slot").on(table.branchId, table.slotDate, table.slotMinute, table.status),
    index("idx_reservations_guest").on(table.branchId, table.guestEmail),
    index("idx_reservations_starts_at").on(table.status, table.startsAt),
    check("reservations_party_size", sql`${table.partySize} >= 1`),
    check("reservations_status", sql`${table.status} IN ('pending', 'confirmed', 'cancelled')`),
    check("reservations_cancelled_by", sql`${table.cancelledBy} IS NULL OR ${table.cancelledBy} IN ('guest', 'staff')`),
  ],
);
