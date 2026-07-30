import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const loyaltyPrograms = sqliteTable("loyalty_programs", {
  restaurantId: text("restaurant_id").primaryKey(),
  type: text("type", { enum: ["points", "stamps"] }).notNull(),
  pointsPerCurrencyUnit: integer("points_per_currency_unit").notNull(),
  pointsPerVisit: integer("points_per_visit").notNull(),
  stampsPerVisit: integer("stamps_per_visit").notNull(),
  rulesJson: text("rules_json"),
  isActive: integer("is_active", { mode: "boolean" }).notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const loyaltyRewards = sqliteTable(
  "loyalty_rewards",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    cost: integer("cost").notNull(),
    type: text("type", { enum: ["percentage_discount", "free_dish", "special_price"] }).notNull(),
    percentage: integer("percentage"),
    specialPrice: integer("special_price"),
    freeDishId: text("free_dish_id"),
    isActive: integer("is_active", { mode: "boolean" }).notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    deletedAt: integer("deleted_at"),
  },
  (table) => [index("idx_loyalty_rewards_restaurant").on(table.restaurantId)],
);

export const loyaltyTransactions = sqliteTable(
  "loyalty_transactions",
  {
    id: integer("id").primaryKey(),
    customerId: text("customer_id").notNull(),
    restaurantId: text("restaurant_id").notNull(),
    branchId: text("branch_id"),
    type: text("type", { enum: ["earn", "redeem", "adjust", "expire"] }).notNull(),
    points: integer("points").notNull(),
    reasonCode: text("reason_code"),
    orderId: text("order_id"),
    redemptionId: text("redemption_id"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("idx_loyalty_tx_customer").on(table.customerId, table.restaurantId, table.createdAt)],
);

export const loyaltyRedemptions = sqliteTable(
  "loyalty_redemptions",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id").notNull(),
    restaurantId: text("restaurant_id").notNull(),
    branchId: text("branch_id"),
    rewardId: text("reward_id").notNull(),
    cost: integer("cost").notNull(),
    status: text("status", { enum: ["pending", "validated", "rejected", "expired"] }).notNull(),
    validatedBy: text("validated_by"),
    validatedAt: integer("validated_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("idx_loyalty_redemptions_customer").on(table.customerId, table.restaurantId, table.createdAt),
    index("idx_loyalty_redemptions_status").on(table.restaurantId, table.status),
  ],
);
