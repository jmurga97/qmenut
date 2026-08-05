import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { branches } from "./branches";
import { customers } from "./customers";
import { dishes } from "./menu";
import { restaurants, restaurantUsers } from "./restaurants";

const epochMilliseconds = sql`(unixepoch() * 1000)`;

export const loyaltyPrograms = sqliteTable(
  "loyalty_programs",
  {
    restaurantId: text("restaurant_id")
      .primaryKey()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["points", "stamps"] }).notNull(),
    pointsPerCurrencyUnit: integer("points_per_currency_unit").notNull().default(0),
    pointsPerVisit: integer("points_per_visit").notNull().default(0),
    stampsPerVisit: integer("stamps_per_visit").notNull().default(0),
    rulesJson: text("rules_json"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
  },
  (table) => [
    check("loyalty_programs_type", sql`${table.type} IN ('points', 'stamps')`),
    check("loyalty_programs_currency_points", sql`${table.pointsPerCurrencyUnit} >= 0`),
    check("loyalty_programs_visit_points", sql`${table.pointsPerVisit} >= 0`),
    check("loyalty_programs_visit_stamps", sql`${table.stampsPerVisit} >= 0`),
  ],
);

export const loyaltyRewards = sqliteTable(
  "loyalty_rewards",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    cost: integer("cost").notNull(),
    type: text("type", {
      enum: ["percentage_discount", "free_dish", "special_price"],
    }).notNull(),
    percentage: integer("percentage"),
    specialPrice: integer("special_price"),
    freeDishId: text("free_dish_id").references(() => dishes.id, { onDelete: "set null" }),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
    deletedAt: integer("deleted_at"),
  },
  (table) => [
    index("idx_loyalty_rewards_restaurant")
      .on(table.restaurantId)
      .where(sql`${table.deletedAt} IS NULL`),
    check("loyalty_rewards_cost", sql`${table.cost} >= 0`),
    check("loyalty_rewards_type", sql`${table.type} IN ('percentage_discount', 'free_dish', 'special_price')`),
    check("loyalty_rewards_percentage", sql`${table.percentage} IS NULL OR ${table.percentage} BETWEEN 0 AND 100`),
    check("loyalty_rewards_special_price", sql`${table.specialPrice} IS NULL OR ${table.specialPrice} >= 0`),
  ],
);

export const loyaltyTransactions = sqliteTable(
  "loyalty_transactions",
  {
    id: integer("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    restaurantId: text("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    branchId: text("branch_id").references(() => branches.id, { onDelete: "set null" }),
    type: text("type", { enum: ["earn", "redeem", "adjust", "expire"] }).notNull(),
    points: integer("points").notNull(),
    reasonCode: text("reason_code"),
    orderId: text("order_id"),
    redemptionId: text("redemption_id"),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
  },
  (table) => [
    index("idx_loyalty_tx_customer").on(table.customerId, table.restaurantId, table.createdAt),
    check("loyalty_transactions_type", sql`${table.type} IN ('earn', 'redeem', 'adjust', 'expire')`),
  ],
);

export const loyaltyRedemptions = sqliteTable(
  "loyalty_redemptions",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    restaurantId: text("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    branchId: text("branch_id").references(() => branches.id, { onDelete: "set null" }),
    rewardId: text("reward_id")
      .notNull()
      .references(() => loyaltyRewards.id),
    cost: integer("cost").notNull(),
    status: text("status", { enum: ["pending", "validated", "rejected", "expired"] })
      .notNull()
      .default("pending"),
    validatedBy: text("validated_by").references(() => restaurantUsers.id, {
      onDelete: "set null",
    }),
    validatedAt: integer("validated_at"),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
  },
  (table) => [
    index("idx_loyalty_redemptions_customer").on(table.customerId, table.restaurantId, table.createdAt),
    index("idx_loyalty_redemptions_status").on(table.restaurantId, table.status),
    check("loyalty_redemptions_cost", sql`${table.cost} >= 0`),
    check("loyalty_redemptions_status", sql`${table.status} IN ('pending', 'validated', 'rejected', 'expired')`),
  ],
);
