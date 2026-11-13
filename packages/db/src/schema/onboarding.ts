import { sql } from "drizzle-orm";
import { check, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const onboardingIntakes = sqliteTable(
  "onboarding_intakes",
  {
    id: text("id").primaryKey(),
    countryCode: text("country_code", { enum: ["ESP", "VEN"] }).notNull(),
    label: text("label").notNull(),
    contactEmail: text("contact_email").notNull(),
    createdBy: text("created_by").notNull(),
    status: text("status", { enum: ["pending", "submitted", "used"] })
      .notNull()
      .default("pending"),
    dataJson: text("data_json"),
    sentAt: integer("sent_at"),
    submittedAt: integer("submitted_at"),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    check("onboarding_country", sql`${table.countryCode} IN ('ESP', 'VEN')`),
    check("onboarding_status", sql`${table.status} IN ('pending', 'submitted', 'used')`),
  ],
);
