import { ROLE_CODES } from "@qmenut/permissions";
import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  unique,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { users } from "./auth";

const epochMilliseconds = sql`(unixepoch() * 1000)`;

export const restaurants = sqliteTable(
  "restaurants",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    defaultLanguageCode: text("default_language_code").notNull().default("es"),
    defaultCurrency: text("default_currency").notNull().default("EUR"),
    timezone: text("timezone").notNull().default("Europe/Madrid"),
    emailFromName: text("email_from_name"),
    emailFromAddress: text("email_from_address"),
    emailReplyTo: text("email_reply_to"),
    legalName: text("legal_name"),
    taxId: text("tax_id"),
    legalAddress: text("legal_address"),
    dataProtectionEmail: text("data_protection_email"),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
    deletedAt: integer("deleted_at"),
  },
  (table) => [check("restaurants_default_currency_length", sql`length(${table.defaultCurrency}) = 3`)],
);

export const branches = sqliteTable(
  "branches",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    address: text("address"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    socialLinksJson: text("social_links_json"),
    customDomain: text("custom_domain"),
    currency: text("currency").notNull().default("EUR"),
    planCode: text("plan_code", { enum: ["basic", "business"] })
      .notNull()
      .default("basic"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
    deletedAt: integer("deleted_at"),
  },
  (table) => [
    unique("ux_branches_id_restaurant").on(table.id, table.restaurantId),
    index("idx_branches_restaurant")
      .on(table.restaurantId)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("ux_branches_custom_domain")
      .on(table.customDomain)
      .where(sql`${table.customDomain} IS NOT NULL`),
    check("branches_currency_length", sql`length(${table.currency}) = 3`),
    check("branches_plan_code", sql`${table.planCode} IN ('basic', 'business')`),
  ],
);

export const branchPhotos = sqliteTable(
  "branch_photos",
  {
    id: text("id").primaryKey(),
    branchId: text("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
  },
  (table) => [index("idx_branch_photos_branch").on(table.branchId)],
);

export const branchSchedules = sqliteTable(
  "branch_schedules",
  {
    id: text("id").primaryKey(),
    branchId: text("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    openMinute: integer("open_minute").notNull(),
    closeMinute: integer("close_minute").notNull(),
  },
  (table) => [
    index("idx_branch_schedules_branch").on(table.branchId, table.dayOfWeek),
    check("branch_schedules_day", sql`${table.dayOfWeek} BETWEEN 1 AND 7`),
    check("branch_schedules_open", sql`${table.openMinute} BETWEEN 0 AND 1439`),
    check("branch_schedules_close", sql`${table.closeMinute} BETWEEN 0 AND 1439`),
  ],
);

export const restaurantUsers = sqliteTable(
  "restaurant_users",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleCode: text("role_code", { enum: ROLE_CODES }).notNull().default("staff"),
    isDriver: integer("is_driver", { mode: "boolean" }).notNull().default(false),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
  },
  (table) => [
    unique("ux_restaurant_users_restaurant_user").on(table.restaurantId, table.userId),
    index("idx_restaurant_users_user").on(table.userId),
    check("restaurant_users_role", sql`${table.roleCode} IN ('owner', 'admin', 'staff')`),
  ],
);

export const branchSubscriptions = sqliteTable(
  "branch_subscriptions",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id").notNull(),
    branchId: text("branch_id").notNull(),
    planCode: text("plan_code", { enum: ["basic", "business"] }).notNull(),
    status: text("status", { enum: ["trialing", "active", "past_due", "canceled"] })
      .notNull()
      .default("trialing"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    currentPeriodEnd: integer("current_period_end"),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
    stripePriceId: text("stripe_price_id"),
    cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [
    foreignKey({
      columns: [table.branchId, table.restaurantId],
      foreignColumns: [branches.id, branches.restaurantId],
    }).onDelete("cascade"),
    index("idx_branch_subscriptions_restaurant").on(table.restaurantId),
    uniqueIndex("ux_branch_subscriptions_active")
      .on(table.branchId)
      .where(sql`${table.status} <> 'canceled'`),
    uniqueIndex("ux_branch_subscriptions_branch").on(table.branchId),
    uniqueIndex("ux_branch_subscriptions_stripe_sub")
      .on(table.stripeSubscriptionId)
      .where(sql`${table.stripeSubscriptionId} IS NOT NULL`),
    check("branch_subscriptions_plan", sql`${table.planCode} IN ('basic', 'business')`),
    check("branch_subscriptions_status", sql`${table.status} IN ('trialing', 'active', 'past_due', 'canceled')`),
  ],
);

export const restaurantStripeAccounts = sqliteTable(
  "restaurant_stripe_accounts",
  {
    restaurantId: text("restaurant_id")
      .primaryKey()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    stripeAccountId: text("stripe_account_id").notNull().unique(),
    status: text("status", { enum: ["pending", "connected", "disabled"] })
      .notNull()
      .default("pending"),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
  },
  (table) => [check("restaurant_stripe_accounts_status", sql`${table.status} IN ('pending', 'connected', 'disabled')`)],
);

export const restaurantLanguages = sqliteTable(
  "restaurant_languages",
  {
    restaurantId: text("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    languageCode: text("language_code").notNull(),
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
  },
  (table) => [
    primaryKey({ columns: [table.restaurantId, table.languageCode] }),
    uniqueIndex("ux_restaurant_languages_default")
      .on(table.restaurantId)
      .where(sql`${table.isDefault} = 1`),
  ],
);
