import { sql } from "drizzle-orm";
import { check, index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { branches } from "./branches";
import { dishes } from "./menu";

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
  },
  (table) => [
    primaryKey({ columns: [table.branchId, table.day, table.languageCode, table.source] }),
    check("menu_view_daily_views", sql`${table.views} >= 0`),
  ],
);

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
  },
  (table) => [
    primaryKey({ columns: [table.dishId, table.day] }),
    index("idx_dish_view_daily_branch").on(table.branchId, table.day),
    check("dish_view_daily_views", sql`${table.views} >= 0`),
  ],
);
