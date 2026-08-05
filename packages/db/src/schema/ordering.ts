import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  real,
  sqliteTable,
  text,
  unique,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { branches } from "./branches";
import { customers } from "./customers";
import { dishes } from "./menu";
import { restaurantUsers } from "./restaurants";

const epochMilliseconds = sql`(unixepoch() * 1000)`;

export const deliveryZones = sqliteTable(
  "delivery_zones",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id").notNull(),
    branchId: text("branch_id").notNull(),
    name: text("name").notNull(),
    radiusKm: real("radius_km").notNull(),
    deliveryFee: integer("delivery_fee").notNull().default(0),
    minOrderAmount: integer("min_order_amount").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
  },
  (table) => [
    foreignKey({
      columns: [table.branchId, table.restaurantId],
      foreignColumns: [branches.id, branches.restaurantId],
    }).onDelete("cascade"),
    index("idx_delivery_zones_branch").on(table.branchId),
    check("delivery_zones_radius", sql`${table.radiusKm} > 0`),
    check("delivery_zones_fee", sql`${table.deliveryFee} >= 0`),
    check("delivery_zones_min_order", sql`${table.minOrderAmount} >= 0`),
  ],
);

export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id").notNull(),
    branchId: text("branch_id").notNull(),
    customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
    mode: text("mode", { enum: ["pickup", "delivery"] }).notNull(),
    status: text("status", {
      enum: ["received", "preparing", "ready", "on_the_way", "delivered", "canceled"],
    })
      .notNull()
      .default("received"),
    deliveryAddress: text("delivery_address"),
    deliveryZoneId: text("delivery_zone_id").references(() => deliveryZones.id, {
      onDelete: "set null",
    }),
    deliveryFee: integer("delivery_fee").notNull().default(0),
    subtotal: integer("subtotal").notNull().default(0),
    total: integer("total").notNull().default(0),
    currency: text("currency").notNull().default("EUR"),
    desiredTime: integer("desired_time"),
    kitchenNote: text("kitchen_note"),
    driverId: text("driver_id").references(() => restaurantUsers.id, { onDelete: "set null" }),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
  },
  (table) => [
    foreignKey({
      columns: [table.branchId, table.restaurantId],
      foreignColumns: [branches.id, branches.restaurantId],
    }).onDelete("cascade"),
    unique("ux_orders_id_restaurant").on(table.id, table.restaurantId),
    index("idx_orders_branch_status").on(table.branchId, table.status, table.createdAt),
    index("idx_orders_customer").on(table.customerId, table.createdAt),
    index("idx_orders_driver").on(table.driverId, table.status),
    check("orders_mode", sql`${table.mode} IN ('pickup', 'delivery')`),
    check(
      "orders_status",
      sql`${table.status} IN ('received', 'preparing', 'ready', 'on_the_way', 'delivered', 'canceled')`,
    ),
    check("orders_delivery_fee", sql`${table.deliveryFee} >= 0`),
    check("orders_subtotal", sql`${table.subtotal} >= 0`),
    check("orders_total", sql`${table.total} >= 0`),
    check("orders_currency_length", sql`length(${table.currency}) = 3`),
  ],
);

export const orderItems = sqliteTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    dishId: text("dish_id").references(() => dishes.id, { onDelete: "set null" }),
    dishName: text("dish_name").notNull(),
    selectedOptionsJson: text("selected_options_json"),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: integer("unit_price").notNull(),
    lineTotal: integer("line_total").notNull(),
  },
  (table) => [
    index("idx_order_items_order").on(table.orderId),
    check("order_items_quantity", sql`${table.quantity} > 0`),
    check("order_items_unit_price", sql`${table.unitPrice} >= 0`),
    check("order_items_line_total", sql`${table.lineTotal} >= 0`),
  ],
);

export const payments = sqliteTable(
  "payments",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id").notNull(),
    orderId: text("order_id").notNull(),
    stripePaymentIntentId: text("stripe_payment_intent_id").notNull(),
    status: text("status", {
      enum: ["requires_payment", "processing", "succeeded", "failed", "refunded"],
    })
      .notNull()
      .default("requires_payment"),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("EUR"),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
  },
  (table) => [
    foreignKey({
      columns: [table.orderId, table.restaurantId],
      foreignColumns: [orders.id, orders.restaurantId],
    }).onDelete("cascade"),
    index("idx_payments_order").on(table.orderId),
    uniqueIndex("idx_payments_intent").on(table.stripePaymentIntentId),
    check(
      "payments_status",
      sql`${table.status} IN ('requires_payment', 'processing', 'succeeded', 'failed', 'refunded')`,
    ),
    check("payments_amount", sql`${table.amount} >= 0`),
    check("payments_currency_length", sql`length(${table.currency}) = 3`),
  ],
);
