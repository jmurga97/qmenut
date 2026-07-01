// Drizzle schema for the PUBLIC menu surface.
//
// This mirrors the public-facing tables of `migrations/0001_initial_schema.sql`.
// IMPORTANT: the wrangler migration is the source of truth for the DB. This file
// exists only so resolvers can build typed queries — we do NOT run `drizzle-kit
// migrate`. Keep it in sync with the migration by hand when columns change.
//
// Storage conventions from the migration:
//   * ids        → TEXT (UUID v7)
//   * money      → INTEGER (cents)
//   * timestamps → INTEGER (epoch ms) — exposed raw, so kept as `number`
//   * booleans   → INTEGER 0/1 — modeled as { mode: "boolean" } so Drizzle hands
//                  resolvers real booleans (mappers no longer do `=== 1`)
//   * deleted_at → INTEGER nullable, used only in WHERE (never exposed)

import { integer, primaryKey, sqliteTable, sqliteView, text, unique } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull(),
});

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const verifications = sqliteTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
});

export const branches = sqliteTable(
  "branches",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id").notNull(),
    name: text("name").notNull(),
    address: text("address"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    socialLinksJson: text("social_links_json"),
    customDomain: text("custom_domain"),
    currency: text("currency").notNull(),
    planCode: text("plan_code", { enum: ["basic", "business"] }).notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    deletedAt: integer("deleted_at"),
  },
  // Composite key the multitenant child tables anchor against (branch_id, restaurant_id).
  (table) => [unique("ux_branches_id_restaurant").on(table.id, table.restaurantId)],
);

export const branchPhotos = sqliteTable("branch_photos", {
  id: text("id").primaryKey(),
  branchId: text("branch_id").notNull(),
  url: text("url").notNull(),
  position: integer("position").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const branchSchedules = sqliteTable("branch_schedules", {
  id: text("id").primaryKey(),
  branchId: text("branch_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 1=Mon .. 7=Sun (ISO)
  openMinute: integer("open_minute").notNull(), // 0..1439
  closeMinute: integer("close_minute").notNull(),
});

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id").notNull(),
    branchId: text("branch_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    position: integer("position").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    deletedAt: integer("deleted_at"),
  },
  // Lets dishes anchor (category_id, branch_id).
  (table) => [unique("ux_categories_id_branch").on(table.id, table.branchId)],
);

export const dishes = sqliteTable("dishes", {
  id: text("id").primaryKey(),
  restaurantId: text("restaurant_id").notNull(),
  branchId: text("branch_id").notNull(),
  categoryId: text("category_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(), // cents
  imageUrl: text("image_url"),
  position: integer("position").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull(),
  isRecommended: integer("is_recommended", { mode: "boolean" }).notNull(),
  isFeatured: integer("is_featured", { mode: "boolean" }).notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  deletedAt: integer("deleted_at"),
});

export const dishAvailabilityWindows = sqliteTable("dish_availability_windows", {
  id: text("id").primaryKey(),
  dishId: text("dish_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 1..7
  startMinute: integer("start_minute").notNull(), // 0..1439
  endMinute: integer("end_minute").notNull(),
});

export const dishVariantGroups = sqliteTable("dish_variant_groups", {
  id: text("id").primaryKey(),
  dishId: text("dish_id").notNull(),
  name: text("name").notNull(),
  selectionType: text("selection_type", { enum: ["single", "multiple"] }).notNull(),
  isRequired: integer("is_required", { mode: "boolean" }).notNull(),
  minSelect: integer("min_select").notNull(),
  maxSelect: integer("max_select"), // NULL = no limit
  position: integer("position").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const dishVariantOptions = sqliteTable("dish_variant_options", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull(),
  name: text("name").notNull(),
  priceDelta: integer("price_delta").notNull(), // cents, add-on only (>= 0)
  position: integer("position").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  restaurantId: text("restaurant_id"), // NULL = system tag
  code: text("code"), // system tags
  label: text("label"), // custom tags
  color: text("color"),
  isSystem: integer("is_system", { mode: "boolean" }).notNull(),
  createdAt: integer("created_at").notNull(),
});

export const dishTags = sqliteTable(
  "dish_tags",
  {
    dishId: text("dish_id").notNull(),
    tagId: text("tag_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.dishId, table.tagId] })],
);

export const allergens = sqliteTable("allergens", {
  id: integer("id").primaryKey(), // INTEGER PK, not a UUID
  code: text("code").notNull(),
});

export const dishAllergens = sqliteTable(
  "dish_allergens",
  {
    dishId: text("dish_id").notNull(),
    allergenId: integer("allergen_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.dishId, table.allergenId] })],
);

export const translations = sqliteTable(
  "translations",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id").notNull(),
    entityType: text("entity_type", {
      enum: ["dish", "category", "variant_group", "variant_option"],
    }).notNull(),
    entityId: text("entity_id").notNull(),
    languageCode: text("language_code").notNull(),
    field: text("field").notNull(),
    value: text("value").notNull(),
    status: text("status", { enum: ["ok", "pending_update"] }).notNull(),
    source: text("source", { enum: ["machine", "manual"] }).notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [unique("ux_translations_lookup").on(table.entityType, table.entityId, table.languageCode, table.field)],
);

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
  percentage: integer("percentage"), // 0..100
  specialPrice: integer("special_price"), // cents
  buyQuantity: integer("buy_quantity"),
  paidQuantity: integer("paid_quantity"),
  priority: integer("priority").notNull(),
  startsAt: integer("starts_at"),
  endsAt: integer("ends_at"),
  isRecurring: integer("is_recurring", { mode: "boolean" }).notNull(),
  recurringDays: text("recurring_days"), // CSV ISO "4,5"
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

// Read-only view: per dish, the candidate promotions and their effective unit price.
// Defined here with `.existing()` because the view is created by the migration, not Drizzle.
// The Worker still applies the time/recurrence filter and the priority tiebreak (Phase G).
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
