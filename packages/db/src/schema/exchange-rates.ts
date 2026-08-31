import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "./auth";
import { restaurants } from "./tenancy";

const epochMilliseconds = sql`(unixepoch() * 1000)`;

export const restaurantExchangeRates = sqliteTable("restaurant_exchange_rates", {
  restaurantId: text("restaurant_id")
    .primaryKey()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  rate: text("rate").notNull(),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(false),
  updatedBy: text("updated_by")
    .notNull()
    .references(() => users.id),
  updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
});
