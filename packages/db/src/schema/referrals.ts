import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { restaurants } from "./tenancy";

const epochMilliseconds = sql`(unixepoch() * 1000)`;

/** Imported contacts for referral campaigns. Unsubscribed and bounced leads are never enrolled again. */
export const referralLeads = sqliteTable(
  "referral_leads",
  {
    id: text("id").primaryKey(),
    // Lowercased on import.
    email: text("email").notNull(),
    name: text("name"),
    importLabel: text("import_label"),
    status: text("status", { enum: ["active", "unsubscribed", "bounced"] })
      .notNull()
      .default("active"),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
  },
  (table) => [
    uniqueIndex("ux_referral_leads_email").on(table.email),
    index("idx_referral_leads_status").on(table.status, table.createdAt),
    check("referral_leads_status", sql`${table.status} IN ('active', 'unsubscribed', 'bounced')`),
  ],
);

export const referralCampaigns = sqliteTable("referral_campaigns", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  importLabel: text("import_label"),
  dailyLimit: integer("daily_limit"),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at").notNull().default(epochMilliseconds),
});

/** One Instantly campaign. Size, reward and template are frozen once it leaves draft. */
export const referralBatches = sqliteTable(
  "referral_batches",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => referralCampaigns.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    size: integer("size").notNull(),
    rewardCents: integer("reward_cents").notNull(),
    status: text("status", { enum: ["draft", "preparing", "sending", "paused", "completed"] })
      .notNull()
      .default("draft"),
    templateVersion: integer("template_version"),
    scheduledAt: integer("scheduled_at"),
    providerCampaignId: text("provider_campaign_id"),
    recipientCount: integer("recipient_count").notNull().default(0),
    // Preparation lease, so overlapping cron ticks never upload the same batch twice.
    leaseUntil: integer("lease_until"),
    lastError: text("last_error"),
    launchedAt: integer("launched_at"),
    launchedBy: text("launched_by"),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
  },
  (table) => [
    uniqueIndex("ux_referral_batches_position").on(table.campaignId, table.position),
    index("idx_referral_batches_status").on(table.status),
    index("idx_referral_batches_schedule").on(table.status, table.scheduledAt),
    check("referral_batches_size", sql`${table.size} BETWEEN 1 AND 50000`),
    check("referral_batches_reward", sql`${table.rewardCents} > 0`),
    check("referral_batches_status", sql`${table.status} IN ('draft', 'preparing', 'sending', 'paused', 'completed')`),
  ],
);

/** A lead's single invitation. The id is the opaque code in the invitation link. */
export const referralRecipients = sqliteTable(
  "referral_recipients",
  {
    id: text("id").primaryKey(),
    batchId: text("batch_id")
      .notNull()
      .references(() => referralBatches.id, { onDelete: "cascade" }),
    leadId: text("lead_id")
      .notNull()
      .references(() => referralLeads.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name"),
    // Frozen offer: retries and later batches never change it.
    rewardCents: integer("reward_cents").notNull(),
    templateVersion: integer("template_version").notNull(),
    status: text("status", { enum: ["pending", "enrolled", "skipped", "failed"] })
      .notNull()
      .default("pending"),
    failureReason: text("failure_reason"),
    sentAt: integer("sent_at"),
    clickedAt: integer("clicked_at"),
    firstVisitAt: integer("first_visit_at"),
    visitCount: integer("visit_count").notNull().default(0),
    repliedAt: integer("replied_at"),
    bouncedAt: integer("bounced_at"),
    unsubscribedAt: integer("unsubscribed_at"),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
  },
  (table) => [
    // One invitation per person.
    uniqueIndex("ux_referral_recipients_lead").on(table.leadId),
    index("idx_referral_recipients_batch").on(table.batchId, table.status),
    index("idx_referral_recipients_email").on(table.email),
    check("referral_recipients_status", sql`${table.status} IN ('pending', 'enrolled', 'skipped', 'failed')`),
  ],
);

/** Created when the participant verifies their email; the reward never changes afterwards. */
export const referralParticipants = sqliteTable(
  "referral_participants",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    rewardCents: integer("reward_cents").notNull(),
    // The invitation that set the reward; null for public $50 sign-ups.
    recipientId: text("recipient_id").references(() => referralRecipients.id, { onDelete: "set null" }),
    // Pago Móvil, requested only after a first approval.
    payoutBank: text("payout_bank"),
    payoutIdNumber: text("payout_id_number"),
    payoutPhone: text("payout_phone"),
    payoutUpdatedAt: integer("payout_updated_at"),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
  },
  (table) => [uniqueIndex("ux_referral_participants_email").on(table.email)],
);

/**
 * Emailed links (verify, access) and private sessions. Only the SHA-256 of the secret is stored.
 * Links are single-use; a verify link carries the sign-up it confirms in `payload`.
 */
export const referralTokens = sqliteTable(
  "referral_tokens",
  {
    hash: text("hash").primaryKey(),
    kind: text("kind", { enum: ["verify", "access", "session"] }).notNull(),
    email: text("email").notNull(),
    participantId: text("participant_id").references(() => referralParticipants.id, { onDelete: "cascade" }),
    payload: text("payload"),
    expiresAt: integer("expires_at").notNull(),
    usedAt: integer("used_at"),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
  },
  (table) => [
    index("idx_referral_tokens_participant").on(table.participantId),
    index("idx_referral_tokens_expires").on(table.expiresAt),
    check("referral_tokens_kind", sql`${table.kind} IN ('verify', 'access', 'session')`),
  ],
);

export const referrals = sqliteTable(
  "referrals",
  {
    id: text("id").primaryKey(),
    participantId: text("participant_id")
      .notNull()
      .references(() => referralParticipants.id, { onDelete: "cascade" }),
    restaurantName: text("restaurant_name").notNull(),
    // Lowercased, accent- and space-free name for duplicate warnings.
    restaurantKey: text("restaurant_key").notNull(),
    contactName: text("contact_name").notNull(),
    contactPhone: text("contact_phone").notNull(),
    contactEmail: text("contact_email"),
    city: text("city"),
    website: text("website"),
    status: text("status", { enum: ["received", "in_progress", "approved", "rejected"] })
      .notNull()
      .default("received"),
    rejectionReason: text("rejection_reason"),
    // Snapshot of the participant's reward when the referral arrived.
    rewardCents: integer("reward_cents").notNull(),
    notes: text("notes"),
    restaurantId: text("restaurant_id").references(() => restaurants.id, { onDelete: "set null" }),
    paymentCents: integer("payment_cents"),
    // Local YYYY-MM-DD.
    paymentDate: text("payment_date"),
    paymentReference: text("payment_reference"),
    approvedAt: integer("approved_at"),
    payoutStatus: text("payout_status", { enum: ["unpaid", "paid"] })
      .notNull()
      .default("unpaid"),
    payoutVesCents: integer("payout_ves_cents"),
    // Bolívares per dollar as a decimal string, e.g. "36.5210".
    payoutRate: text("payout_rate"),
    payoutReference: text("payout_reference"),
    paidAt: integer("paid_at"),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
    updatedAt: integer("updated_at").notNull().default(epochMilliseconds),
  },
  (table) => [
    index("idx_referrals_participant").on(table.participantId, table.createdAt),
    index("idx_referrals_status").on(table.status, table.createdAt),
    index("idx_referrals_restaurant_key").on(table.restaurantKey),
    index("idx_referrals_contact_phone").on(table.contactPhone),
    // One reward per restaurant.
    uniqueIndex("ux_referrals_approved_restaurant")
      .on(table.restaurantId)
      .where(sql`${table.status} = 'approved'`),
    check("referrals_status", sql`${table.status} IN ('received', 'in_progress', 'approved', 'rejected')`),
    check("referrals_payout_status", sql`${table.payoutStatus} IN ('unpaid', 'paid')`),
    check(
      "referrals_approved_payment",
      sql`${table.status} <> 'approved' OR (${table.paymentCents} IS NOT NULL AND ${table.paymentDate} IS NOT NULL AND ${table.paymentReference} IS NOT NULL)`,
    ),
    check("referrals_paid_approved", sql`${table.payoutStatus} = 'unpaid' OR ${table.status} = 'approved'`),
  ],
);

/** Instantly events, deduplicated by the email worker's event id. */
export const referralEmailEvents = sqliteTable(
  "referral_email_events",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    recipientId: text("recipient_id").references(() => referralRecipients.id, { onDelete: "set null" }),
    providerCampaignId: text("provider_campaign_id"),
    occurredAt: integer("occurred_at").notNull(),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
  },
  (table) => [
    index("idx_referral_email_events_recipient").on(table.recipientId),
    index("idx_referral_email_events_type").on(table.type),
  ],
);

export const referralAudit = sqliteTable(
  "referral_audit",
  {
    id: text("id").primaryKey(),
    entityType: text("entity_type", { enum: ["lead", "campaign", "batch", "participant", "referral"] }).notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    // Staff email, "participant" or "system".
    actor: text("actor").notNull(),
    details: text("details"),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
  },
  (table) => [index("idx_referral_audit_entity").on(table.entityType, table.entityId, table.createdAt)],
);
