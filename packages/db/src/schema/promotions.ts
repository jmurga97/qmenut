import { integer, primaryKey, sqliteTable, sqliteView, text } from "drizzle-orm/sqlite-core";

export const promotions = sqliteTable("promotions", {
  id: text("id").primaryKey(),
  restaurantId: text("restaurant_id").notNull(),
  branchId: text("branch_id").notNull(),
  type: text("type", {
    enum: ["percentage_discount", "special_price", "daily_menu", "happy_hour", "two_for_one"],
  }).notNull(),
  scope: text("scope", { enum: ["info", "branch", "category", "dish"] }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  percentage: integer("percentage"),
  specialPrice: integer("special_price"),
  buyQuantity: integer("buy_quantity"),
  paidQuantity: integer("paid_quantity"),
  priority: integer("priority").notNull(),
  startsAt: integer("starts_at"),
  endsAt: integer("ends_at"),
  isRecurring: integer("is_recurring", { mode: "boolean" }).notNull(),
  recurringDays: text("recurring_days"),
  recurringStartMinute: integer("recurring_start_minute"),
  recurringEndMinute: integer("recurring_end_minute"),
  status: text("status", { enum: ["active", "inactive", "expired"] }).notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  deletedAt: integer("deleted_at"),
});

export const promotionTargets = sqliteTable(
  "promotion_targets",
  {
    promotionId: text("promotion_id").notNull(),
    targetType: text("target_type", { enum: ["dish", "category"] }).notNull(),
    targetId: text("target_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.promotionId, table.targetType, table.targetId] })],
);

export const vDishPromotionPrices = sqliteView("v_dish_promotion_prices", {
  dishId: text("dish_id").notNull(),
  branchId: text("branch_id").notNull(),
  basePrice: integer("base_price").notNull(),
  promotionId: text("promotion_id").notNull(),
  promotionType: text("promotion_type", {
    enum: ["percentage_discount", "special_price", "daily_menu", "happy_hour", "two_for_one"],
  }).notNull(),
  promotionScope: text("promotion_scope", { enum: ["info", "branch", "category", "dish"] }).notNull(),
  priority: integer("priority").notNull(),
  effectiveUnitPrice: integer("effective_unit_price").notNull(),
  buyQuantity: integer("buy_quantity"),
  paidQuantity: integer("paid_quantity"),
  startsAt: integer("starts_at"),
  endsAt: integer("ends_at"),
  isRecurring: integer("is_recurring", { mode: "boolean" }).notNull(),
  recurringDays: text("recurring_days"),
  recurringStartMinute: integer("recurring_start_minute"),
  recurringEndMinute: integer("recurring_end_minute"),
}).existing();
