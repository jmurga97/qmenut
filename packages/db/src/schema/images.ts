import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, unique, uniqueIndex } from "drizzle-orm/sqlite-core";

const epochMilliseconds = sql`(unixepoch() * 1000)`;

export const imageVariants = sqliteTable(
  "image_variants",
  {
    id: text("id").primaryKey(),
    canonicalUrl: text("canonical_url").notNull(),
    url: text("url").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    format: text("format").notNull(),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
  },
  (table) => [
    unique("ux_image_variants_canonical_width_format").on(table.canonicalUrl, table.width, table.format),
    uniqueIndex("ux_image_variants_url").on(table.url),
    index("idx_image_variants_canonical").on(table.canonicalUrl),
  ],
);
