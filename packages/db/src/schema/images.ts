import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, unique, uniqueIndex } from "drizzle-orm/sqlite-core";

const epochMilliseconds = sql`(unixepoch() * 1000)`;

export interface PendingImageReference {
  url?: string;
  uploadId?: string;
  position: number;
}

/** Product ownership only. Ming owns the job's processing state and manifest. */
export const imageUploads = sqliteTable("image_uploads", {
  uploadId: text("upload_id").primaryKey(),
  restaurantId: text("restaurant_id").notNull(),
  branchId: text("branch_id").notNull(),
  purpose: text("purpose", { enum: ["branchLogo", "branchPhoto", "categoryImage", "dishImage"] }).notNull(),
  createdAt: integer("created_at").notNull(),
});

/** One current intent per image field; revision fences late publications. */
export const imageAssignments = sqliteTable(
  "image_assignments",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id").notNull(),
    branchId: text("branch_id").notNull(),
    entityId: text("entity_id").notNull(),
    purpose: text("purpose", { enum: ["branchLogo", "branchPhoto", "categoryImage", "dishImage"] }).notNull(),
    revision: text("revision").notNull(),
    images: text("images", { mode: "json" }).$type<PendingImageReference[]>().notNull(),
    status: text("status", { enum: ["pending", "applied", "failed", "superseded"] }).notNull(),
    error: text("error"),
    invalidatedAt: integer("invalidated_at"),
    nextAttemptAt: integer("next_attempt_at").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("ux_image_assignment_target").on(table.restaurantId, table.entityId, table.purpose),
    index("idx_image_assignment_due").on(table.status, table.nextAttemptAt),
    index("idx_image_assignment_branch").on(table.restaurantId, table.branchId),
  ],
);

/** Accepted form writes, committed in the same batch as their domain changes. */
export const adminSaveOperations = sqliteTable("admin_save_operations", {
  id: text("id").primaryKey(),
  restaurantId: text("restaurant_id").notNull(),
  fingerprint: text("fingerprint").notNull(),
  entityId: text("entity_id").notNull(),
  createdAt: integer("created_at").notNull(),
});

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
