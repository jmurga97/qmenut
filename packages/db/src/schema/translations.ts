import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const translations = sqliteTable(
  "translations",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id").notNull(),
    entityType: text("entity_type", {
      enum: ["dish", "category", "variant_group", "variant_option", "ingredient"],
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
