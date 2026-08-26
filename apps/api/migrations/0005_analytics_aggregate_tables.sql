CREATE TABLE `analytics_sync_state` (
	`scope` text PRIMARY KEY NOT NULL,
	`backfill_completed_at` integer,
	`last_successful_day` text,
	`last_run_at` integer,
	`last_success_at` integer,
	`last_error_code` text,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "analytics_sync_state_scope" CHECK("analytics_sync_state"."scope" = 'posthog')
);
--> statement-breakpoint
CREATE TABLE `category_activity_daily` (
	`branch_id` text NOT NULL,
	`day` text NOT NULL,
	`language_code` text DEFAULT 'all' NOT NULL,
	`category_id` text NOT NULL,
	`category_label` text,
	`reached_count` integer DEFAULT 0 NOT NULL,
	`selected_count` integer DEFAULT 0 NOT NULL,
	`max_position` integer,
	PRIMARY KEY(`branch_id`, `day`, `language_code`, `category_id`),
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "category_activity_daily_reached" CHECK("category_activity_daily"."reached_count" >= 0),
	CONSTRAINT "category_activity_daily_selected" CHECK("category_activity_daily"."selected_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE `contact_action_daily` (
	`branch_id` text NOT NULL,
	`day` text NOT NULL,
	`language_code` text DEFAULT 'all' NOT NULL,
	`channel` text NOT NULL,
	`action_count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`branch_id`, `day`, `language_code`, `channel`),
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "contact_action_daily_channel" CHECK("contact_action_daily"."channel" IN ('map', 'phone', 'social', 'whatsapp')),
	CONSTRAINT "contact_action_daily_count" CHECK("contact_action_daily"."action_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE `digest_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`period_start_day` text NOT NULL,
	`period_end_day` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error_code` text,
	`lease_expires_at` integer,
	`sent_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "digest_deliveries_status" CHECK("digest_deliveries"."status" IN ('pending', 'sending', 'sent', 'failed')),
	CONSTRAINT "digest_deliveries_attempts" CHECK("digest_deliveries"."attempts" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_digest_deliveries_status` ON `digest_deliveries` (`status`,`lease_expires_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_digest_deliveries_recipient_period` ON `digest_deliveries` (`restaurant_id`,`user_id`,`period_end_day`);--> statement-breakpoint
CREATE TABLE `digest_schedule` (
	`id` integer PRIMARY KEY NOT NULL,
	`anchor_end_day` text,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "digest_schedule_singleton" CHECK("digest_schedule"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE `event_counter_daily` (
	`branch_id` text NOT NULL,
	`day` text NOT NULL,
	`event_code` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`branch_id`, `day`, `event_code`),
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "event_counter_daily_count" CHECK("event_counter_daily"."count" >= 0)
);
--> statement-breakpoint
CREATE TABLE `hourly_activity_daily` (
	`branch_id` text NOT NULL,
	`day` text NOT NULL,
	`hour` integer NOT NULL,
	`loads` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`branch_id`, `day`, `hour`),
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "hourly_activity_daily_hour" CHECK("hourly_activity_daily"."hour" BETWEEN 0 AND 23),
	CONSTRAINT "hourly_activity_daily_loads" CHECK("hourly_activity_daily"."loads" >= 0)
);
--> statement-breakpoint
CREATE TABLE `promotion_open_daily` (
	`restaurant_id` text NOT NULL,
	`day` text NOT NULL,
	`language_code` text DEFAULT 'all' NOT NULL,
	`promotion_id` text NOT NULL,
	`promotion_name` text,
	`open_count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`restaurant_id`, `day`, `language_code`, `promotion_id`),
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "promotion_open_daily_count" CHECK("promotion_open_daily"."open_count" >= 0)
);
