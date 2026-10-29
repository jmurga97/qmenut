import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { branches } from "./branches";
import { restaurants, restaurantUsers } from "./restaurants";

const epochMilliseconds = sql`(unixepoch() * 1000)`;

/** One row per event. Handled state is shared by the restaurant; read state lives per member in recipients. */
export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    // Null shows on every branch (announcements).
    branchId: text("branch_id").references(() => branches.id, { onDelete: "set null" }),
    // No CHECK: new types must not need a table rebuild. The API's event map is the source of truth.
    type: text("type").notNull(),
    subjectId: text("subject_id"),
    factsJson: text("facts_json").notNull().default("{}"),
    actionable: integer("actionable", { mode: "boolean" }).notNull().default(false),
    handledAt: integer("handled_at"),
    handledBy: text("handled_by").references(() => restaurantUsers.id, { onDelete: "set null" }),
    handledOutcome: text("handled_outcome"),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [
    uniqueIndex("ux_notifications_subject").on(table.type, table.subjectId),
    index("idx_notifications_restaurant_branch").on(table.restaurantId, table.branchId, table.createdAt),
    index("idx_notifications_expires").on(table.expiresAt),
  ],
);

export const notificationRecipients = sqliteTable(
  "notification_recipients",
  {
    notificationId: text("notification_id")
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
    membershipId: text("membership_id")
      .notNull()
      .references(() => restaurantUsers.id, { onDelete: "cascade" }),
    readAt: integer("read_at"),
  },
  (table) => [
    primaryKey({ columns: [table.notificationId, table.membershipId] }),
    index("idx_notification_recipients_member").on(table.membershipId, table.readAt),
  ],
);

export const pushDevices = sqliteTable(
  "push_devices",
  {
    id: text("id").primaryKey(),
    membershipId: text("membership_id")
      .notNull()
      .references(() => restaurantUsers.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    language: text("language", { enum: ["es", "en"] }).notNull(),
    // JSON array of followed branch ids, filtered with json_each.
    branchIds: text("branch_ids").notNull(),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
  },
  (table) => [index("idx_push_devices_member").on(table.membershipId)],
);
