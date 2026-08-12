import { sql } from "drizzle-orm";
import { check, foreignKey, index, integer, primaryKey, sqliteTable, sqliteView, text } from "drizzle-orm/sqlite-core";

import { branches } from "./branches";

const epochMilliseconds = sql`(unixepoch() * 1000)`;

export const promotionTypes = [
  "percentage_discount",
  "special_price",
  "daily_menu",
  "happy_hour",
  "two_for_one",
] as const;

export type PromotionType = (typeof promotionTypes)[number];

export const promotions = sqliteTable(
  "promotions",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id").notNull(),
    branchId: text("branch_id").notNull(),
    type: text("type", { enum: promotionTypes }).notNull(),
    scope: text("scope", { enum: ["info", "branch", "category", "dish"] })
      .notNull()
      .default("info"),
    name: text("name").notNull(),
    description: text("description"),
    percentage: integer("percentage"),
    specialPrice: integer("special_price"),
    buyQuantity: integer("buy_quantity"),
    paidQuantity: integer("paid_quantity"),
    priority: integer("priority").notNull().default(0),
    startsAt: integer("starts_at"),
    endsAt: integer("ends_at"),
    isRecurring: integer("is_recurring", { mode: "boolean" }).notNull().default(false),
    recurringDays: text("recurring_days"),
    recurringStartMinute: integer("recurring_start_minute"),
    recurringEndMinute: integer("recurring_end_minute"),
    status: text("status", { enum: ["active", "inactive", "expired"] })
      .notNull()
      .default("active"),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
    deletedAt: integer("deleted_at"),
  },
  (table) => [
    foreignKey({
      columns: [table.branchId, table.restaurantId],
      foreignColumns: [branches.id, branches.restaurantId],
    }).onDelete("cascade"),
    index("idx_promotions_branch")
      .on(table.branchId, table.status, table.scope)
      .where(sql`${table.deletedAt} IS NULL`),
    check(
      "promotions_type",
      sql`${table.type} IN ('percentage_discount', 'special_price', 'daily_menu', 'happy_hour', 'two_for_one')`,
    ),
    check("promotions_scope", sql`${table.scope} IN ('info', 'branch', 'category', 'dish')`),
    check("promotions_percentage", sql`${table.percentage} IS NULL OR ${table.percentage} BETWEEN 0 AND 100`),
    check("promotions_special_price", sql`${table.specialPrice} IS NULL OR ${table.specialPrice} >= 0`),
    check("promotions_buy_quantity", sql`${table.buyQuantity} IS NULL OR ${table.buyQuantity} > 0`),
    check("promotions_paid_quantity", sql`${table.paidQuantity} IS NULL OR ${table.paidQuantity} > 0`),
    check(
      "promotions_recurring_start",
      sql`${table.recurringStartMinute} IS NULL OR ${table.recurringStartMinute} BETWEEN 0 AND 1439`,
    ),
    check(
      "promotions_recurring_end",
      sql`${table.recurringEndMinute} IS NULL OR ${table.recurringEndMinute} BETWEEN 0 AND 1439`,
    ),
    check("promotions_status", sql`${table.status} IN ('active', 'inactive', 'expired')`),
    check(
      "promotions_required_values",
      sql`
        ${table.scope} = 'info'
        OR (${table.type} = 'percentage_discount' AND ${table.percentage} IS NOT NULL)
        OR (${table.type} IN ('special_price', 'daily_menu') AND ${table.specialPrice} IS NOT NULL)
        OR (${table.type} = 'happy_hour' AND (${table.percentage} IS NOT NULL OR ${table.specialPrice} IS NOT NULL))
        OR (${table.type} = 'two_for_one' AND ${table.buyQuantity} IS NOT NULL AND ${table.paidQuantity} IS NOT NULL AND ${table.paidQuantity} <= ${table.buyQuantity})
      `,
    ),
  ],
);

export const promotionTargets = sqliteTable(
  "promotion_targets",
  {
    promotionId: text("promotion_id")
      .notNull()
      .references(() => promotions.id, { onDelete: "cascade" }),
    targetType: text("target_type", { enum: ["dish", "category"] }).notNull(),
    targetId: text("target_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.promotionId, table.targetType, table.targetId] }),
    index("idx_promotion_targets_target").on(table.targetType, table.targetId),
    check("promotion_targets_type", sql`${table.targetType} IN ('dish', 'category')`),
  ],
);

export const vDishPromotionPrices = sqliteView("v_dish_promotion_prices", {
  dishId: text("dish_id").notNull(),
  branchId: text("branch_id").notNull(),
  basePrice: integer("base_price").notNull(),
  promotionId: text("promotion_id").notNull(),
  promotionType: text("promotion_type", { enum: promotionTypes }).notNull(),
  promotionScope: text("promotion_scope", {
    enum: ["info", "branch", "category", "dish"],
  }).notNull(),
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
}).as(sql`
  SELECT
      d.id        AS dish_id,
      d.branch_id AS branch_id,
      d.price     AS base_price,
      p.id        AS promotion_id,
      p.type      AS promotion_type,
      p.scope     AS promotion_scope,
      p.priority  AS priority,
      CASE
          WHEN p.type = 'percentage_discount'
              THEN CAST(ROUND(d.price * (100 - p.percentage) / 100.0) AS INTEGER)
          WHEN p.type IN ('special_price','daily_menu')
              THEN p.special_price
          WHEN p.type = 'happy_hour'
              THEN COALESCE(p.special_price, CAST(ROUND(d.price * (100 - p.percentage) / 100.0) AS INTEGER))
          ELSE d.price
      END         AS effective_unit_price,
      p.buy_quantity,
      p.paid_quantity,
      p.starts_at,
      p.ends_at,
      p.is_recurring,
      p.recurring_days,
      p.recurring_start_minute,
      p.recurring_end_minute
  FROM dishes d
  JOIN promotions p
    ON p.branch_id = d.branch_id
   AND p.deleted_at IS NULL
   AND p.status = 'active'
   AND p.scope <> 'info'
  WHERE d.deleted_at IS NULL
    AND (
          p.scope = 'branch'
       OR (p.scope = 'dish' AND EXISTS (
            SELECT 1 FROM promotion_targets t
            WHERE t.promotion_id = p.id AND t.target_type = 'dish' AND t.target_id = d.id
          ))
       OR (p.scope = 'category' AND EXISTS (
            SELECT 1 FROM promotion_targets t
            WHERE t.promotion_id = p.id AND t.target_type = 'category' AND t.target_id = d.category_id
          ))
        )
`);
