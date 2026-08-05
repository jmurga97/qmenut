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

import { branches } from "./branches";
import { restaurants } from "./restaurants";

const epochMilliseconds = sql`(unixepoch() * 1000)`;

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id").notNull(),
    branchId: text("branch_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    position: integer("position").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
    deletedAt: integer("deleted_at"),
  },
  (table) => [
    foreignKey({
      columns: [table.branchId, table.restaurantId],
      foreignColumns: [branches.id, branches.restaurantId],
    }).onDelete("cascade"),
    unique("ux_categories_id_branch").on(table.id, table.branchId),
    index("idx_categories_branch")
      .on(table.branchId, table.position)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

export const dishes = sqliteTable(
  "dishes",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id").notNull(),
    branchId: text("branch_id").notNull(),
    categoryId: text("category_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    price: integer("price").notNull(),
    imageUrl: text("image_url"),
    position: integer("position").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    isRecommended: integer("is_recommended", { mode: "boolean" }).notNull().default(false),
    isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
    deletedAt: integer("deleted_at"),
  },
  (table) => [
    foreignKey({
      columns: [table.branchId, table.restaurantId],
      foreignColumns: [branches.id, branches.restaurantId],
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.categoryId, table.branchId],
      foreignColumns: [categories.id, categories.branchId],
    }).onDelete("cascade"),
    index("idx_dishes_category")
      .on(table.categoryId, table.position)
      .where(sql`${table.deletedAt} IS NULL`),
    index("idx_dishes_branch")
      .on(table.branchId)
      .where(sql`${table.deletedAt} IS NULL`),
    check("dishes_price", sql`${table.price} >= 0`),
  ],
);

export const dishAvailabilityWindows = sqliteTable(
  "dish_availability_windows",
  {
    id: text("id").primaryKey(),
    dishId: text("dish_id")
      .notNull()
      .references(() => dishes.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    startMinute: integer("start_minute").notNull(),
    endMinute: integer("end_minute").notNull(),
  },
  (table) => [
    index("idx_dish_availability_dish").on(table.dishId),
    check("dish_availability_day", sql`${table.dayOfWeek} BETWEEN 1 AND 7`),
    check("dish_availability_start", sql`${table.startMinute} BETWEEN 0 AND 1439`),
    check("dish_availability_end", sql`${table.endMinute} BETWEEN 0 AND 1439`),
  ],
);

export const dishVariantGroups = sqliteTable(
  "dish_variant_groups",
  {
    id: text("id").primaryKey(),
    dishId: text("dish_id")
      .notNull()
      .references(() => dishes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    selectionType: text("selection_type", { enum: ["single", "multiple"] }).notNull(),
    isRequired: integer("is_required", { mode: "boolean" }).notNull().default(false),
    minSelect: integer("min_select").notNull().default(0),
    maxSelect: integer("max_select"),
    position: integer("position").notNull().default(0),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
  },
  (table) => [
    index("idx_variant_groups_dish").on(table.dishId, table.position),
    check("dish_variant_groups_selection", sql`${table.selectionType} IN ('single', 'multiple')`),
    check("dish_variant_groups_min", sql`${table.minSelect} >= 0`),
    check("dish_variant_groups_max", sql`${table.maxSelect} IS NULL OR ${table.maxSelect} >= ${table.minSelect}`),
  ],
);

export const dishVariantOptions = sqliteTable(
  "dish_variant_options",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => dishVariantGroups.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    priceDelta: integer("price_delta").notNull().default(0),
    position: integer("position").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
  },
  (table) => [
    index("idx_variant_options_group").on(table.groupId, table.position),
    check("dish_variant_options_price_delta", sql`${table.priceDelta} >= 0`),
  ],
);

export const ingredients = sqliteTable(
  "ingredients",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    price: integer("price").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
    deletedAt: integer("deleted_at"),
  },
  (table) => [
    index("idx_ingredients_restaurant")
      .on(table.restaurantId, table.name)
      .where(sql`${table.deletedAt} IS NULL`),
    check("ingredients_price", sql`${table.price} >= 0`),
  ],
);

export const dishExtras = sqliteTable(
  "dish_extras",
  {
    dishId: text("dish_id")
      .notNull()
      .references(() => dishes.id, { onDelete: "cascade" }),
    ingredientId: text("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.dishId, table.ingredientId] }),
    index("idx_dish_extras_dish").on(table.dishId, table.position),
    index("idx_dish_extras_ingredient").on(table.ingredientId),
  ],
);

export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id").references(() => restaurants.id, { onDelete: "cascade" }),
    code: text("code"),
    label: text("label"),
    color: text("color"),
    isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
  },
  (table) => [
    uniqueIndex("idx_tags_system_code")
      .on(table.code)
      .where(sql`${table.isSystem} = 1`),
    index("idx_tags_restaurant")
      .on(table.restaurantId)
      .where(sql`${table.isSystem} = 0`),
    check(
      "tags_ownership",
      sql`
        (${table.isSystem} = 1 AND ${table.code} IS NOT NULL AND ${table.restaurantId} IS NULL)
        OR (${table.isSystem} = 0 AND ${table.label} IS NOT NULL AND ${table.restaurantId} IS NOT NULL)
      `,
    ),
  ],
);

export const dishTags = sqliteTable(
  "dish_tags",
  {
    dishId: text("dish_id")
      .notNull()
      .references(() => dishes.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.dishId, table.tagId] }), index("idx_dish_tags_tag").on(table.tagId)],
);

export const allergens = sqliteTable("allergens", {
  id: integer("id").primaryKey(),
  code: text("code").notNull().unique(),
});

export const dishAllergens = sqliteTable(
  "dish_allergens",
  {
    dishId: text("dish_id")
      .notNull()
      .references(() => dishes.id, { onDelete: "cascade" }),
    allergenId: integer("allergen_id")
      .notNull()
      .references(() => allergens.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.dishId, table.allergenId] }),
    index("idx_dish_allergens_allergen").on(table.allergenId),
  ],
);
