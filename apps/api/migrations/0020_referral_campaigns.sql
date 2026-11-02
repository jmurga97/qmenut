CREATE TABLE `referral_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`actor` text NOT NULL,
	`details` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_referral_audit_entity` ON `referral_audit` (`entity_type`,`entity_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `referral_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`position` integer NOT NULL,
	`size` integer NOT NULL,
	`reward_cents` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`template_version` integer,
	`provider_campaign_id` text,
	`recipient_count` integer DEFAULT 0 NOT NULL,
	`lease_until` integer,
	`last_error` text,
	`launched_at` integer,
	`launched_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `referral_campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "referral_batches_size" CHECK("referral_batches"."size" BETWEEN 1 AND 50000),
	CONSTRAINT "referral_batches_reward" CHECK("referral_batches"."reward_cents" > 0),
	CONSTRAINT "referral_batches_status" CHECK("referral_batches"."status" IN ('draft', 'preparing', 'sending', 'paused', 'completed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_referral_batches_position` ON `referral_batches` (`campaign_id`,`position`);--> statement-breakpoint
CREATE INDEX `idx_referral_batches_status` ON `referral_batches` (`status`);--> statement-breakpoint
CREATE TABLE `referral_campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `referral_email_events` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`recipient_id` text,
	`provider_campaign_id` text,
	`occurred_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`recipient_id`) REFERENCES `referral_recipients`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_referral_email_events_recipient` ON `referral_email_events` (`recipient_id`);--> statement-breakpoint
CREATE INDEX `idx_referral_email_events_type` ON `referral_email_events` (`type`);--> statement-breakpoint
CREATE TABLE `referral_leads` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`import_label` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "referral_leads_status" CHECK("referral_leads"."status" IN ('active', 'unsubscribed', 'bounced'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_referral_leads_email` ON `referral_leads` (`email`);--> statement-breakpoint
CREATE INDEX `idx_referral_leads_status` ON `referral_leads` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `referral_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`reward_cents` integer NOT NULL,
	`recipient_id` text,
	`payout_bank` text,
	`payout_id_number` text,
	`payout_phone` text,
	`payout_updated_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`recipient_id`) REFERENCES `referral_recipients`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_referral_participants_email` ON `referral_participants` (`email`);--> statement-breakpoint
CREATE TABLE `referral_recipients` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`lead_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`reward_cents` integer NOT NULL,
	`template_version` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`failure_reason` text,
	`sent_at` integer,
	`clicked_at` integer,
	`first_visit_at` integer,
	`visit_count` integer DEFAULT 0 NOT NULL,
	`replied_at` integer,
	`bounced_at` integer,
	`unsubscribed_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `referral_batches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lead_id`) REFERENCES `referral_leads`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "referral_recipients_status" CHECK("referral_recipients"."status" IN ('pending', 'enrolled', 'skipped', 'failed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_referral_recipients_lead` ON `referral_recipients` (`lead_id`);--> statement-breakpoint
CREATE INDEX `idx_referral_recipients_batch` ON `referral_recipients` (`batch_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_referral_recipients_email` ON `referral_recipients` (`email`);--> statement-breakpoint
CREATE TABLE `referral_tokens` (
	`hash` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`email` text NOT NULL,
	`participant_id` text,
	`payload` text,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`participant_id`) REFERENCES `referral_participants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "referral_tokens_kind" CHECK("referral_tokens"."kind" IN ('verify', 'access', 'session'))
);
--> statement-breakpoint
CREATE INDEX `idx_referral_tokens_participant` ON `referral_tokens` (`participant_id`);--> statement-breakpoint
CREATE INDEX `idx_referral_tokens_expires` ON `referral_tokens` (`expires_at`);--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` text PRIMARY KEY NOT NULL,
	`participant_id` text NOT NULL,
	`restaurant_name` text NOT NULL,
	`restaurant_key` text NOT NULL,
	`contact_name` text NOT NULL,
	`contact_phone` text NOT NULL,
	`contact_email` text,
	`city` text,
	`website` text,
	`status` text DEFAULT 'received' NOT NULL,
	`rejection_reason` text,
	`reward_cents` integer NOT NULL,
	`notes` text,
	`restaurant_id` text,
	`payment_cents` integer,
	`payment_date` text,
	`payment_reference` text,
	`approved_at` integer,
	`payout_status` text DEFAULT 'unpaid' NOT NULL,
	`payout_ves_cents` integer,
	`payout_rate` text,
	`payout_reference` text,
	`paid_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`participant_id`) REFERENCES `referral_participants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "referrals_status" CHECK("referrals"."status" IN ('received', 'in_progress', 'approved', 'rejected')),
	CONSTRAINT "referrals_payout_status" CHECK("referrals"."payout_status" IN ('unpaid', 'paid')),
	CONSTRAINT "referrals_approved_payment" CHECK("referrals"."status" <> 'approved' OR ("referrals"."payment_cents" IS NOT NULL AND "referrals"."payment_date" IS NOT NULL AND "referrals"."payment_reference" IS NOT NULL)),
	CONSTRAINT "referrals_paid_approved" CHECK("referrals"."payout_status" = 'unpaid' OR "referrals"."status" = 'approved')
);
--> statement-breakpoint
CREATE INDEX `idx_referrals_participant` ON `referrals` (`participant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_referrals_status` ON `referrals` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_referrals_restaurant_key` ON `referrals` (`restaurant_key`);--> statement-breakpoint
CREATE INDEX `idx_referrals_contact_phone` ON `referrals` (`contact_phone`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_referrals_approved_restaurant` ON `referrals` (`restaurant_id`) WHERE "referrals"."status" = 'approved';