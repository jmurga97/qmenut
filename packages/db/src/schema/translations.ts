import { sql } from "drizzle-orm";
import { check, index, integer, primaryKey, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

import { restaurants } from "./restaurants";

const epochMilliseconds = sql`(unixepoch() * 1000)`;
const ENTITY_TYPES = [
  "dish",
  "category",
  "variant_group",
  "variant_option",
  "ingredient",
  "promotion",
  "branch",
  "reward",
] as const;

export const translations = sqliteTable(
  "translations",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    entityType: text("entity_type", { enum: ENTITY_TYPES }).notNull(),
    entityId: text("entity_id").notNull(),
    languageCode: text("language_code").notNull(),
    field: text("field").notNull(),
    value: text("value").notNull(),
    sourceText: text("source_text"),
    isManual: integer("is_manual", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
  },
  (table) => [
    unique("ux_translations_lookup").on(table.entityType, table.entityId, table.languageCode, table.field),
    index("idx_translations_lookup").on(table.entityType, table.entityId, table.languageCode),
    check(
      "translations_entity_type",
      sql`${table.entityType} IN ('dish', 'category', 'variant_group', 'variant_option', 'ingredient', 'promotion', 'branch', 'reward')`,
    ),
  ],
);

/** Texts kept in the base language in every language; DeepL never receives them. */
export const translationLocks = sqliteTable(
  "translation_locks",
  {
    restaurantId: text("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    entityType: text("entity_type", { enum: ENTITY_TYPES }).notNull(),
    entityId: text("entity_id").notNull(),
    field: text("field").notNull(),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
  },
  (table) => [
    primaryKey({ columns: [table.restaurantId, table.entityType, table.entityId, table.field] }),
    check(
      "translation_locks_entity_type",
      sql`${table.entityType} IN ('dish', 'category', 'variant_group', 'variant_option', 'ingredient', 'promotion', 'branch', 'reward')`,
    ),
  ],
);
