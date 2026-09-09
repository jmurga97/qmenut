import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

import { restaurants } from "./restaurants";

const epochMilliseconds = sql`(unixepoch() * 1000)`;

export const translations = sqliteTable(
  "translations",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    entityType: text("entity_type", {
      enum: ["dish", "category", "variant_group", "variant_option", "ingredient"],
    }).notNull(),
    entityId: text("entity_id").notNull(),
    languageCode: text("language_code").notNull(),
    field: text("field").notNull(),
    value: text("value").notNull(),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
  },
  (table) => [
    unique("ux_translations_lookup").on(table.entityType, table.entityId, table.languageCode, table.field),
    index("idx_translations_lookup").on(table.entityType, table.entityId, table.languageCode),
    check(
      "translations_entity_type",
      sql`${table.entityType} IN ('dish', 'category', 'variant_group', 'variant_option', 'ingredient')`,
    ),
  ],
);
