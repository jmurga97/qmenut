import { integer, primaryKey, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

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
  (table) => [unique("ux_categories_id_branch").on(table.id, table.branchId)],
);

export const dishes = sqliteTable("dishes", {
  id: text("id").primaryKey(),
  restaurantId: text("restaurant_id").notNull(),
  branchId: text("branch_id").notNull(),
  categoryId: text("category_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
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
  dayOfWeek: integer("day_of_week").notNull(),
  startMinute: integer("start_minute").notNull(),
  endMinute: integer("end_minute").notNull(),
});

export const dishVariantGroups = sqliteTable("dish_variant_groups", {
  id: text("id").primaryKey(),
  dishId: text("dish_id").notNull(),
  name: text("name").notNull(),
  selectionType: text("selection_type", { enum: ["single", "multiple"] }).notNull(),
  isRequired: integer("is_required", { mode: "boolean" }).notNull(),
  minSelect: integer("min_select").notNull(),
  maxSelect: integer("max_select"),
  position: integer("position").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const dishVariantOptions = sqliteTable("dish_variant_options", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull(),
  name: text("name").notNull(),
  priceDelta: integer("price_delta").notNull(),
  position: integer("position").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  restaurantId: text("restaurant_id"),
  code: text("code"),
  label: text("label"),
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
  id: integer("id").primaryKey(),
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
