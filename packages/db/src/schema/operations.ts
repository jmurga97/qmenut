import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { branches } from "./branches";
import { restaurants } from "./restaurants";

const epochMilliseconds = sql`(unixepoch() * 1000)`;

export const planChangeLogs = sqliteTable(
  "plan_change_logs",
  {
    id: integer("id").primaryKey(),
    restaurantId: text("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    branchId: text("branch_id").references(() => branches.id, { onDelete: "set null" }),
    fromPlan: text("from_plan"),
    toPlan: text("to_plan").notNull(),
    changedByClerkUserId: text("changed_by_clerk_user_id"),
    note: text("note"),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
  },
  (table) => [index("idx_plan_change_logs_restaurant").on(table.restaurantId, table.createdAt)],
);

export const internalAlerts = sqliteTable(
  "internal_alerts",
  {
    id: integer("id").primaryKey(),
    type: text("type", {
      enum: ["domain_renewal", "inactive_restaurant", "plan_issue", "other"],
    }).notNull(),
    restaurantId: text("restaurant_id").references(() => restaurants.id, {
      onDelete: "cascade",
    }),
    branchId: text("branch_id").references(() => branches.id, { onDelete: "set null" }),
    severity: text("severity", { enum: ["info", "warning", "critical"] })
      .notNull()
      .default("info"),
    status: text("status", { enum: ["open", "resolved", "dismissed"] })
      .notNull()
      .default("open"),
    messageCode: text("message_code").notNull(),
    payloadJson: text("payload_json"),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    resolvedAt: integer("resolved_at"),
  },
  (table) => [
    index("idx_internal_alerts_status").on(table.status, table.type, table.createdAt),
    check(
      "internal_alerts_type",
      sql`${table.type} IN ('domain_renewal', 'inactive_restaurant', 'plan_issue', 'other')`,
    ),
    check("internal_alerts_severity", sql`${table.severity} IN ('info', 'warning', 'critical')`),
    check("internal_alerts_status", sql`${table.status} IN ('open', 'resolved', 'dismissed')`),
  ],
);
