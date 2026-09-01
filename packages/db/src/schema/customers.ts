import { sql } from "drizzle-orm";
import { check, foreignKey, index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { branches } from "./branches";
import { restaurants } from "./restaurants";

const epochMilliseconds = sql`(unixepoch() * 1000)`;

export const customers = sqliteTable("customers", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  birthdate: text("birthdate"),
  createdAt: integer("created_at").notNull().default(epochMilliseconds),
  updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
});

export const customerRestaurants = sqliteTable(
  "customer_restaurants",
  {
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    restaurantId: text("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    pointsBalance: integer("points_balance").notNull().default(0),
    stampsBalance: integer("stamps_balance").notNull().default(0),
    loyaltyConsentAcceptedAt: integer("loyalty_consent_accepted_at"),
    loyaltyConsentVersion: text("loyalty_consent_version"),
    firstVisitAt: integer("first_visit_at"),
    lastVisitAt: integer("last_visit_at"),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
  },
  (table) => [
    primaryKey({ columns: [table.customerId, table.restaurantId] }),
    index("idx_customer_restaurants_restaurant").on(table.restaurantId),
    check("customer_restaurants_points", sql`${table.pointsBalance} >= 0`),
    check("customer_restaurants_stamps", sql`${table.stampsBalance} >= 0`),
  ],
);

export const customerVisits = sqliteTable(
  "customer_visits",
  {
    id: integer("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    restaurantId: text("restaurant_id").notNull(),
    branchId: text("branch_id").notNull(),
    source: text("source", { enum: ["qr", "direct", "domain", "order"] }).notNull(),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
  },
  (table) => [
    foreignKey({
      columns: [table.branchId, table.restaurantId],
      foreignColumns: [branches.id, branches.restaurantId],
    }).onDelete("cascade"),
    index("idx_customer_visits_customer").on(table.customerId, table.createdAt),
    index("idx_customer_visits_branch").on(table.branchId, table.createdAt),
    check("customer_visits_source", sql`${table.source} IN ('qr', 'direct', 'domain', 'order')`),
  ],
);
