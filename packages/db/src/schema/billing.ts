import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { restaurants } from "./restaurants";

const epochMilliseconds = sql`(unixepoch() * 1000)`;

export const stripeCustomers = sqliteTable("stripe_customers", {
  restaurantId: text("restaurant_id")
    .primaryKey()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  createdAt: integer("created_at").notNull().default(epochMilliseconds),
  updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
});
