import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const stripeCustomers = sqliteTable("stripe_customers", {
  restaurantId: text("restaurant_id").primaryKey(),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
