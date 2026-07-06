import { index, integer, primaryKey, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const restaurants = sqliteTable("restaurants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  defaultLanguageCode: text("default_language_code").notNull(),
  defaultCurrency: text("default_currency").notNull(),
  emailFromName: text("email_from_name"),
  emailFromAddress: text("email_from_address"),
  emailReplyTo: text("email_reply_to"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  deletedAt: integer("deleted_at"),
});

export const restaurantUsers = sqliteTable(
  "restaurant_users",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id").notNull(),
    userId: text("user_id").notNull(),
    roleCode: text("role_code", { enum: ["owner", "admin", "staff"] }).notNull(),
    isDriver: integer("is_driver", { mode: "boolean" }).notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    unique("ux_restaurant_users_restaurant_user").on(table.restaurantId, table.userId),
    index("idx_restaurant_users_user").on(table.userId),
  ],
);

export const branchSubscriptions = sqliteTable("branch_subscriptions", {
  id: text("id").primaryKey(),
  restaurantId: text("restaurant_id").notNull(),
  branchId: text("branch_id").notNull(),
  planCode: text("plan_code", { enum: ["basic", "business"] }).notNull(),
  status: text("status", { enum: ["trialing", "active", "past_due", "canceled"] }).notNull(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
  cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" }).notNull(),
  currentPeriodEnd: integer("current_period_end"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const restaurantStripeAccounts = sqliteTable("restaurant_stripe_accounts", {
  restaurantId: text("restaurant_id").primaryKey(),
  stripeAccountId: text("stripe_account_id").notNull().unique(),
  status: text("status", { enum: ["pending", "connected", "disabled"] }).notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const restaurantLanguages = sqliteTable(
  "restaurant_languages",
  {
    restaurantId: text("restaurant_id").notNull(),
    languageCode: text("language_code").notNull(),
    isDefault: integer("is_default", { mode: "boolean" }).notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.restaurantId, table.languageCode] })],
);
