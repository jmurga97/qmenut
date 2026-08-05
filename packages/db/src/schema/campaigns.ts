import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { customers } from "./customers";
import { loyaltyRewards } from "./loyalty";
import { restaurants } from "./restaurants";

const epochMilliseconds = sql`(unixepoch() * 1000)`;

export const campaigns = sqliteTable(
  "campaigns",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["reactivation", "birthday", "points_level"] }).notNull(),
    name: text("name").notNull(),
    inactivityDays: integer("inactivity_days"),
    pointsThreshold: integer("points_threshold"),
    triggerConfig: text("trigger_config"),
    emailSubject: text("email_subject").notNull(),
    emailBody: text("email_body").notNull(),
    rewardId: text("reward_id").references(() => loyaltyRewards.id, { onDelete: "set null" }),
    status: text("status", { enum: ["active", "paused"] })
      .notNull()
      .default("active"),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
    deletedAt: integer("deleted_at"),
  },
  (table) => [
    index("idx_campaigns_restaurant")
      .on(table.restaurantId, table.status)
      .where(sql`${table.deletedAt} IS NULL`),
    check("campaigns_type", sql`${table.type} IN ('reactivation', 'birthday', 'points_level')`),
    check("campaigns_inactivity", sql`${table.inactivityDays} IS NULL OR ${table.inactivityDays} > 0`),
    check("campaigns_points", sql`${table.pointsThreshold} IS NULL OR ${table.pointsThreshold} >= 0`),
    check("campaigns_status", sql`${table.status} IN ('active', 'paused')`),
  ],
);

export const campaignSends = sqliteTable(
  "campaign_sends",
  {
    id: integer("id").primaryKey(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["queued", "sent", "opened", "redeemed", "failed"] })
      .notNull()
      .default("queued"),
    sentAt: integer("sent_at"),
    openedAt: integer("opened_at"),
    redeemedAt: integer("redeemed_at"),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
  },
  (table) => [
    index("idx_campaign_sends_campaign").on(table.campaignId, table.status),
    index("idx_campaign_sends_customer").on(table.customerId),
    check("campaign_sends_status", sql`${table.status} IN ('queued', 'sent', 'opened', 'redeemed', 'failed')`),
  ],
);
