import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

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
  dayOfWeek: integer("day_of_week").notNull(),
  openMinute: integer("open_minute").notNull(),
  closeMinute: integer("close_minute").notNull(),
});
