import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const customers = sqliteTable("customers", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  birthdate: text("birthdate"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const customerRestaurants = sqliteTable(
  "customer_restaurants",
  {
    customerId: text("customer_id").notNull(),
    restaurantId: text("restaurant_id").notNull(),
    pointsBalance: integer("points_balance").notNull(),
    stampsBalance: integer("stamps_balance").notNull(),
    firstVisitAt: integer("first_visit_at"),
    lastVisitAt: integer("last_visit_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.customerId, table.restaurantId] }),
    index("idx_customer_restaurants_restaurant").on(table.restaurantId),
  ],
);

export const customerVisits = sqliteTable(
  "customer_visits",
  {
    id: integer("id").primaryKey(),
    customerId: text("customer_id").notNull(),
    restaurantId: text("restaurant_id").notNull(),
    branchId: text("branch_id").notNull(),
    source: text("source", { enum: ["qr", "direct", "domain", "order"] }).notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("idx_customer_visits_customer").on(table.customerId, table.createdAt),
    index("idx_customer_visits_branch").on(table.branchId, table.createdAt),
  ],
);
