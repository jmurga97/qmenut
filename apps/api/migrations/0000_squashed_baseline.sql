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
CREATE TABLE `dish_view_daily` (
	`dish_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`day` text NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`language_code` text DEFAULT 'legacy' NOT NULL,
	`source` text DEFAULT 'legacy' NOT NULL,
	`visits_with_open` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`dish_id`, `branch_id`, `day`, `language_code`, `source`),
	FOREIGN KEY (`dish_id`) REFERENCES `dishes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "dish_view_daily_views" CHECK("dish_view_daily"."views" >= 0),
	CONSTRAINT "dish_view_daily_visits_with_open" CHECK("dish_view_daily"."visits_with_open" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_dish_view_daily_branch` ON `dish_view_daily` (`branch_id`,`day`);--> statement-breakpoint
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
CREATE TABLE `menu_view_daily` (
	`branch_id` text NOT NULL,
	`day` text NOT NULL,
	`language_code` text DEFAULT 'all' NOT NULL,
	`source` text DEFAULT 'all' NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`visits` integer DEFAULT 0 NOT NULL,
	`display_mode` text DEFAULT 'legacy' NOT NULL,
	PRIMARY KEY(`branch_id`, `day`, `language_code`, `source`, `display_mode`),
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "menu_view_daily_views" CHECK("menu_view_daily"."views" >= 0),
	CONSTRAINT "menu_view_daily_visits" CHECK("menu_view_daily"."visits" >= 0)
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
--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_accounts_user` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`active_restaurant_id` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE INDEX `idx_sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_verifications_identifier` ON `verifications` (`identifier`);--> statement-breakpoint
CREATE TABLE `stripe_customers` (
	`restaurant_id` text PRIMARY KEY NOT NULL,
	`stripe_customer_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stripe_customers_stripe_customer_id_unique` ON `stripe_customers` (`stripe_customer_id`);--> statement-breakpoint
CREATE TABLE `branch_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text NOT NULL,
	`url` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_branch_photos_branch` ON `branch_photos` (`branch_id`);--> statement-breakpoint
CREATE TABLE `branch_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text NOT NULL,
	`day_of_week` integer NOT NULL,
	`open_minute` integer NOT NULL,
	`close_minute` integer NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "branch_schedules_day" CHECK("branch_schedules"."day_of_week" BETWEEN 1 AND 7),
	CONSTRAINT "branch_schedules_open" CHECK("branch_schedules"."open_minute" BETWEEN 0 AND 1439),
	CONSTRAINT "branch_schedules_close" CHECK("branch_schedules"."close_minute" BETWEEN 0 AND 1439)
);
--> statement-breakpoint
CREATE INDEX `idx_branch_schedules_branch` ON `branch_schedules` (`branch_id`,`day_of_week`);--> statement-breakpoint
CREATE TABLE `branches` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`latitude` real,
	`longitude` real,
	`phone` text,
	`whatsapp` text,
	`social_links_json` text,
	`logo_url` text,
	`google_place_id` text,
	`google_reviews_enabled` integer DEFAULT false NOT NULL,
	`custom_domain` text,
	`plan_code` text DEFAULT 'basic' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "branches_plan_code" CHECK("branches"."plan_code" IN ('basic', 'business')),
	CONSTRAINT "branches_coordinates_pair" CHECK(("branches"."latitude" IS NULL AND "branches"."longitude" IS NULL) OR ("branches"."latitude" IS NOT NULL AND "branches"."longitude" IS NOT NULL)),
	CONSTRAINT "branches_latitude_range" CHECK("branches"."latitude" IS NULL OR "branches"."latitude" BETWEEN -90 AND 90),
	CONSTRAINT "branches_longitude_range" CHECK("branches"."longitude" IS NULL OR "branches"."longitude" BETWEEN -180 AND 180),
	CONSTRAINT "branches_google_reviews_connection" CHECK("branches"."google_reviews_enabled" = 0 OR "branches"."google_place_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE INDEX `idx_branches_restaurant` ON `branches` (`restaurant_id`) WHERE "branches"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_branches_custom_domain` ON `branches` (`custom_domain`) WHERE "branches"."custom_domain" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_branches_id_restaurant` ON `branches` (`id`,`restaurant_id`);--> statement-breakpoint
CREATE TABLE `campaign_sends` (
	`id` integer PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`sent_at` integer,
	`opened_at` integer,
	`redeemed_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "campaign_sends_status" CHECK("campaign_sends"."status" IN ('queued', 'sent', 'opened', 'redeemed', 'failed'))
);
--> statement-breakpoint
CREATE INDEX `idx_campaign_sends_campaign` ON `campaign_sends` (`campaign_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_campaign_sends_customer` ON `campaign_sends` (`customer_id`);--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`inactivity_days` integer,
	`points_threshold` integer,
	`trigger_config` text,
	`email_subject` text NOT NULL,
	`email_body` text NOT NULL,
	`reward_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reward_id`) REFERENCES `loyalty_rewards`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "campaigns_type" CHECK("campaigns"."type" IN ('reactivation', 'birthday', 'points_level')),
	CONSTRAINT "campaigns_inactivity" CHECK("campaigns"."inactivity_days" IS NULL OR "campaigns"."inactivity_days" > 0),
	CONSTRAINT "campaigns_points" CHECK("campaigns"."points_threshold" IS NULL OR "campaigns"."points_threshold" >= 0),
	CONSTRAINT "campaigns_status" CHECK("campaigns"."status" IN ('active', 'paused'))
);
--> statement-breakpoint
CREATE INDEX `idx_campaigns_restaurant` ON `campaigns` (`restaurant_id`,`status`) WHERE "campaigns"."deleted_at" IS NULL;--> statement-breakpoint
CREATE TABLE `customer_restaurants` (
	`customer_id` text NOT NULL,
	`restaurant_id` text NOT NULL,
	`points_balance` integer DEFAULT 0 NOT NULL,
	`stamps_balance` integer DEFAULT 0 NOT NULL,
	`loyalty_consent_accepted_at` integer,
	`loyalty_consent_version` text,
	`first_visit_at` integer,
	`last_visit_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`customer_id`, `restaurant_id`),
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "customer_restaurants_points" CHECK("customer_restaurants"."points_balance" >= 0),
	CONSTRAINT "customer_restaurants_stamps" CHECK("customer_restaurants"."stamps_balance" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_customer_restaurants_restaurant` ON `customer_restaurants` (`restaurant_id`);--> statement-breakpoint
CREATE TABLE `customer_visits` (
	`id` integer PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`restaurant_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`source` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_id`,`restaurant_id`) REFERENCES `branches`(`id`,`restaurant_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "customer_visits_source" CHECK("customer_visits"."source" IN ('qr', 'direct', 'domain', 'order'))
);
--> statement-breakpoint
CREATE INDEX `idx_customer_visits_customer` ON `customer_visits` (`customer_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_customer_visits_branch` ON `customer_visits` (`branch_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`birthdate` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_email_unique` ON `customers` (`email`);--> statement-breakpoint
CREATE TABLE `restaurant_exchange_rates` (
	`restaurant_id` text PRIMARY KEY NOT NULL,
	`rate` text NOT NULL,
	`is_enabled` integer DEFAULT false NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `loyalty_programs` (
	`restaurant_id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`points_per_currency_unit` integer DEFAULT 0 NOT NULL,
	`points_per_visit` integer DEFAULT 0 NOT NULL,
	`stamps_per_visit` integer DEFAULT 0 NOT NULL,
	`rules_json` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "loyalty_programs_type" CHECK("loyalty_programs"."type" IN ('points', 'stamps')),
	CONSTRAINT "loyalty_programs_currency_points" CHECK("loyalty_programs"."points_per_currency_unit" >= 0),
	CONSTRAINT "loyalty_programs_visit_points" CHECK("loyalty_programs"."points_per_visit" >= 0),
	CONSTRAINT "loyalty_programs_visit_stamps" CHECK("loyalty_programs"."stamps_per_visit" >= 0)
);
--> statement-breakpoint
CREATE TABLE `loyalty_redemptions` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`restaurant_id` text NOT NULL,
	`branch_id` text,
	`reward_id` text NOT NULL,
	`cost` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`validated_by` text,
	`validated_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`reward_id`) REFERENCES `loyalty_rewards`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`validated_by`) REFERENCES `restaurant_users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "loyalty_redemptions_cost" CHECK("loyalty_redemptions"."cost" >= 0),
	CONSTRAINT "loyalty_redemptions_status" CHECK("loyalty_redemptions"."status" IN ('pending', 'validated', 'rejected', 'expired'))
);
--> statement-breakpoint
CREATE INDEX `idx_loyalty_redemptions_customer` ON `loyalty_redemptions` (`customer_id`,`restaurant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_loyalty_redemptions_status` ON `loyalty_redemptions` (`restaurant_id`,`status`);--> statement-breakpoint
CREATE TABLE `loyalty_rewards` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`cost` integer NOT NULL,
	`type` text NOT NULL,
	`percentage` integer,
	`special_price` integer,
	`free_dish_id` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`free_dish_id`) REFERENCES `dishes`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "loyalty_rewards_cost" CHECK("loyalty_rewards"."cost" >= 0),
	CONSTRAINT "loyalty_rewards_type" CHECK("loyalty_rewards"."type" IN ('percentage_discount', 'free_dish', 'special_price')),
	CONSTRAINT "loyalty_rewards_percentage" CHECK("loyalty_rewards"."percentage" IS NULL OR "loyalty_rewards"."percentage" BETWEEN 0 AND 100),
	CONSTRAINT "loyalty_rewards_special_price" CHECK("loyalty_rewards"."special_price" IS NULL OR "loyalty_rewards"."special_price" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_loyalty_rewards_restaurant` ON `loyalty_rewards` (`restaurant_id`) WHERE "loyalty_rewards"."deleted_at" IS NULL;--> statement-breakpoint
CREATE TABLE `loyalty_transactions` (
	`id` integer PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`restaurant_id` text NOT NULL,
	`branch_id` text,
	`type` text NOT NULL,
	`points` integer NOT NULL,
	`reason_code` text,
	`order_id` text,
	`redemption_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "loyalty_transactions_type" CHECK("loyalty_transactions"."type" IN ('earn', 'redeem', 'adjust', 'expire'))
);
--> statement-breakpoint
CREATE INDEX `idx_loyalty_tx_customer` ON `loyalty_transactions` (`customer_id`,`restaurant_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `allergens` (
	`id` integer PRIMARY KEY NOT NULL,
	`code` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `allergens_code_unique` ON `allergens` (`code`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`image_url` text,
	`position` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`branch_id`,`restaurant_id`) REFERENCES `branches`(`id`,`restaurant_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_categories_branch` ON `categories` (`branch_id`,`position`) WHERE "categories"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_categories_id_branch` ON `categories` (`id`,`branch_id`);--> statement-breakpoint
CREATE TABLE `dish_allergens` (
	`dish_id` text NOT NULL,
	`allergen_id` integer NOT NULL,
	PRIMARY KEY(`dish_id`, `allergen_id`),
	FOREIGN KEY (`dish_id`) REFERENCES `dishes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`allergen_id`) REFERENCES `allergens`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_dish_allergens_allergen` ON `dish_allergens` (`allergen_id`);--> statement-breakpoint
CREATE TABLE `dish_availability_windows` (
	`id` text PRIMARY KEY NOT NULL,
	`dish_id` text NOT NULL,
	`day_of_week` integer NOT NULL,
	`start_minute` integer NOT NULL,
	`end_minute` integer NOT NULL,
	FOREIGN KEY (`dish_id`) REFERENCES `dishes`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "dish_availability_day" CHECK("dish_availability_windows"."day_of_week" BETWEEN 1 AND 7),
	CONSTRAINT "dish_availability_start" CHECK("dish_availability_windows"."start_minute" BETWEEN 0 AND 1439),
	CONSTRAINT "dish_availability_end" CHECK("dish_availability_windows"."end_minute" BETWEEN 0 AND 1439)
);
--> statement-breakpoint
CREATE INDEX `idx_dish_availability_dish` ON `dish_availability_windows` (`dish_id`);--> statement-breakpoint
CREATE TABLE `dish_extras` (
	`dish_id` text NOT NULL,
	`ingredient_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`dish_id`, `ingredient_id`),
	FOREIGN KEY (`dish_id`) REFERENCES `dishes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_dish_extras_dish` ON `dish_extras` (`dish_id`,`position`);--> statement-breakpoint
CREATE INDEX `idx_dish_extras_ingredient` ON `dish_extras` (`ingredient_id`);--> statement-breakpoint
CREATE TABLE `dish_tags` (
	`dish_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`dish_id`, `tag_id`),
	FOREIGN KEY (`dish_id`) REFERENCES `dishes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_dish_tags_tag` ON `dish_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `dish_variant_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`dish_id` text NOT NULL,
	`name` text NOT NULL,
	`selection_type` text NOT NULL,
	`is_required` integer DEFAULT false NOT NULL,
	`min_select` integer DEFAULT 0 NOT NULL,
	`max_select` integer,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`dish_id`) REFERENCES `dishes`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "dish_variant_groups_selection" CHECK("dish_variant_groups"."selection_type" IN ('single', 'multiple')),
	CONSTRAINT "dish_variant_groups_min" CHECK("dish_variant_groups"."min_select" >= 0),
	CONSTRAINT "dish_variant_groups_max" CHECK("dish_variant_groups"."max_select" IS NULL OR "dish_variant_groups"."max_select" >= "dish_variant_groups"."min_select")
);
--> statement-breakpoint
CREATE INDEX `idx_variant_groups_dish` ON `dish_variant_groups` (`dish_id`,`position`);--> statement-breakpoint
CREATE TABLE `dish_variant_options` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`name` text NOT NULL,
	`price_delta` integer DEFAULT 0 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `dish_variant_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "dish_variant_options_price_delta" CHECK("dish_variant_options"."price_delta" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_variant_options_group` ON `dish_variant_options` (`group_id`,`position`);--> statement-breakpoint
CREATE TABLE `dishes` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`category_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price` integer NOT NULL,
	`image_url` text,
	`position` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`is_recommended` integer DEFAULT false NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`branch_id`,`restaurant_id`) REFERENCES `branches`(`id`,`restaurant_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`,`branch_id`) REFERENCES `categories`(`id`,`branch_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "dishes_price" CHECK("dishes"."price" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_dishes_category` ON `dishes` (`category_id`,`position`) WHERE "dishes"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX `idx_dishes_branch` ON `dishes` (`branch_id`) WHERE "dishes"."deleted_at" IS NULL;--> statement-breakpoint
CREATE TABLE `ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`name` text NOT NULL,
	`price` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ingredients_price" CHECK("ingredients"."price" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_ingredients_restaurant` ON `ingredients` (`restaurant_id`,`name`) WHERE "ingredients"."deleted_at" IS NULL;--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text,
	`code` text,
	`label` text,
	`color` text,
	`is_system` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "tags_ownership" CHECK(
        ("tags"."is_system" = 1 AND "tags"."code" IS NOT NULL AND "tags"."restaurant_id" IS NULL)
        OR ("tags"."is_system" = 0 AND "tags"."label" IS NOT NULL AND "tags"."restaurant_id" IS NOT NULL)
      )
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_tags_system_code` ON `tags` (`code`) WHERE "tags"."is_system" = 1;--> statement-breakpoint
CREATE INDEX `idx_tags_restaurant` ON `tags` (`restaurant_id`) WHERE "tags"."is_system" = 0;--> statement-breakpoint
CREATE TABLE `internal_alerts` (
	`id` integer PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`restaurant_id` text,
	`branch_id` text,
	`severity` text DEFAULT 'info' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`message_code` text NOT NULL,
	`payload_json` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`resolved_at` integer,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "internal_alerts_type" CHECK("internal_alerts"."type" IN ('domain_renewal', 'inactive_restaurant', 'plan_issue', 'other')),
	CONSTRAINT "internal_alerts_severity" CHECK("internal_alerts"."severity" IN ('info', 'warning', 'critical')),
	CONSTRAINT "internal_alerts_status" CHECK("internal_alerts"."status" IN ('open', 'resolved', 'dismissed'))
);
--> statement-breakpoint
CREATE INDEX `idx_internal_alerts_status` ON `internal_alerts` (`status`,`type`,`created_at`);--> statement-breakpoint
CREATE TABLE `plan_change_logs` (
	`id` integer PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`branch_id` text,
	`from_plan` text,
	`to_plan` text NOT NULL,
	`changed_by_clerk_user_id` text,
	`note` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_plan_change_logs_restaurant` ON `plan_change_logs` (`restaurant_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `delivery_zones` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`name` text NOT NULL,
	`radius_km` real NOT NULL,
	`delivery_fee` integer DEFAULT 0 NOT NULL,
	`min_order_amount` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`branch_id`,`restaurant_id`) REFERENCES `branches`(`id`,`restaurant_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "delivery_zones_radius" CHECK("delivery_zones"."radius_km" > 0),
	CONSTRAINT "delivery_zones_fee" CHECK("delivery_zones"."delivery_fee" >= 0),
	CONSTRAINT "delivery_zones_min_order" CHECK("delivery_zones"."min_order_amount" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_delivery_zones_branch` ON `delivery_zones` (`branch_id`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`dish_id` text,
	`dish_name` text NOT NULL,
	`selected_options_json` text,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_price` integer NOT NULL,
	`line_total` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`dish_id`) REFERENCES `dishes`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "order_items_quantity" CHECK("order_items"."quantity" > 0),
	CONSTRAINT "order_items_unit_price" CHECK("order_items"."unit_price" >= 0),
	CONSTRAINT "order_items_line_total" CHECK("order_items"."line_total" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_order_items_order` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`customer_id` text,
	`mode` text NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`delivery_address` text,
	`delivery_zone_id` text,
	`delivery_fee` integer DEFAULT 0 NOT NULL,
	`subtotal` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`currency` text NOT NULL,
	`desired_time` integer,
	`kitchen_note` text,
	`driver_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`delivery_zone_id`) REFERENCES `delivery_zones`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`driver_id`) REFERENCES `restaurant_users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`branch_id`,`restaurant_id`) REFERENCES `branches`(`id`,`restaurant_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "orders_mode" CHECK("orders"."mode" IN ('pickup', 'delivery')),
	CONSTRAINT "orders_status" CHECK("orders"."status" IN ('received', 'preparing', 'ready', 'on_the_way', 'delivered', 'canceled')),
	CONSTRAINT "orders_delivery_fee" CHECK("orders"."delivery_fee" >= 0),
	CONSTRAINT "orders_subtotal" CHECK("orders"."subtotal" >= 0),
	CONSTRAINT "orders_total" CHECK("orders"."total" >= 0),
	CONSTRAINT "orders_currency_length" CHECK(length("orders"."currency") = 3)
);
--> statement-breakpoint
CREATE INDEX `idx_orders_branch_status` ON `orders` (`branch_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_orders_customer` ON `orders` (`customer_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_orders_driver` ON `orders` (`driver_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_orders_id_restaurant` ON `orders` (`id`,`restaurant_id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`order_id` text NOT NULL,
	`stripe_payment_intent_id` text NOT NULL,
	`status` text DEFAULT 'requires_payment' NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`order_id`,`restaurant_id`) REFERENCES `orders`(`id`,`restaurant_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "payments_status" CHECK("payments"."status" IN ('requires_payment', 'processing', 'succeeded', 'failed', 'refunded')),
	CONSTRAINT "payments_amount" CHECK("payments"."amount" >= 0),
	CONSTRAINT "payments_currency_length" CHECK(length("payments"."currency") = 3)
);
--> statement-breakpoint
CREATE INDEX `idx_payments_order` ON `payments` (`order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payments_intent` ON `payments` (`stripe_payment_intent_id`);--> statement-breakpoint
CREATE TABLE `promotion_targets` (
	`promotion_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	PRIMARY KEY(`promotion_id`, `target_type`, `target_id`),
	FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "promotion_targets_type" CHECK("promotion_targets"."target_type" IN ('dish', 'category'))
);
--> statement-breakpoint
CREATE INDEX `idx_promotion_targets_target` ON `promotion_targets` (`target_type`,`target_id`);--> statement-breakpoint
CREATE TABLE `promotions` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`type` text NOT NULL,
	`scope` text DEFAULT 'info' NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`percentage` integer,
	`special_price` integer,
	`buy_quantity` integer,
	`paid_quantity` integer,
	`priority` integer DEFAULT 0 NOT NULL,
	`starts_at` integer,
	`ends_at` integer,
	`is_recurring` integer DEFAULT false NOT NULL,
	`recurring_days` text,
	`recurring_start_minute` integer,
	`recurring_end_minute` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`branch_id`,`restaurant_id`) REFERENCES `branches`(`id`,`restaurant_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "promotions_type" CHECK("promotions"."type" IN ('percentage_discount', 'special_price', 'daily_menu', 'happy_hour', 'two_for_one')),
	CONSTRAINT "promotions_scope" CHECK("promotions"."scope" IN ('info', 'branch', 'category', 'dish')),
	CONSTRAINT "promotions_percentage" CHECK("promotions"."percentage" IS NULL OR "promotions"."percentage" BETWEEN 0 AND 100),
	CONSTRAINT "promotions_special_price" CHECK("promotions"."special_price" IS NULL OR "promotions"."special_price" >= 0),
	CONSTRAINT "promotions_buy_quantity" CHECK("promotions"."buy_quantity" IS NULL OR "promotions"."buy_quantity" > 0),
	CONSTRAINT "promotions_paid_quantity" CHECK("promotions"."paid_quantity" IS NULL OR "promotions"."paid_quantity" > 0),
	CONSTRAINT "promotions_recurring_start" CHECK("promotions"."recurring_start_minute" IS NULL OR "promotions"."recurring_start_minute" BETWEEN 0 AND 1439),
	CONSTRAINT "promotions_recurring_end" CHECK("promotions"."recurring_end_minute" IS NULL OR "promotions"."recurring_end_minute" BETWEEN 0 AND 1439),
	CONSTRAINT "promotions_status" CHECK("promotions"."status" IN ('active', 'inactive', 'expired')),
	CONSTRAINT "promotions_required_values" CHECK(
        "promotions"."scope" = 'info'
        OR ("promotions"."type" = 'percentage_discount' AND "promotions"."percentage" IS NOT NULL)
        OR ("promotions"."type" IN ('special_price', 'daily_menu') AND "promotions"."special_price" IS NOT NULL)
        OR ("promotions"."type" = 'happy_hour' AND ("promotions"."percentage" IS NOT NULL OR "promotions"."special_price" IS NOT NULL))
        OR ("promotions"."type" = 'two_for_one' AND "promotions"."buy_quantity" IS NOT NULL AND "promotions"."paid_quantity" IS NOT NULL AND "promotions"."paid_quantity" <= "promotions"."buy_quantity")
      )
);
--> statement-breakpoint
CREATE INDEX `idx_promotions_branch` ON `promotions` (`branch_id`,`status`,`scope`) WHERE "promotions"."deleted_at" IS NULL;--> statement-breakpoint
CREATE TABLE `branch_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`plan_code` text NOT NULL,
	`status` text DEFAULT 'trialing' NOT NULL,
	`stripe_subscription_id` text,
	`current_period_end` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`stripe_price_id` text,
	`cancel_at_period_end` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`branch_id`,`restaurant_id`) REFERENCES `branches`(`id`,`restaurant_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "branch_subscriptions_plan" CHECK("branch_subscriptions"."plan_code" IN ('basic', 'business')),
	CONSTRAINT "branch_subscriptions_status" CHECK("branch_subscriptions"."status" IN ('trialing', 'active', 'past_due', 'canceled'))
);
--> statement-breakpoint
CREATE INDEX `idx_branch_subscriptions_restaurant` ON `branch_subscriptions` (`restaurant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_branch_subscriptions_active` ON `branch_subscriptions` (`branch_id`) WHERE "branch_subscriptions"."status" <> 'canceled';--> statement-breakpoint
CREATE UNIQUE INDEX `ux_branch_subscriptions_branch` ON `branch_subscriptions` (`branch_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_branch_subscriptions_stripe_sub` ON `branch_subscriptions` (`stripe_subscription_id`) WHERE "branch_subscriptions"."stripe_subscription_id" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `restaurant_languages` (
	`restaurant_id` text NOT NULL,
	`language_code` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`restaurant_id`, `language_code`),
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_restaurant_languages_default` ON `restaurant_languages` (`restaurant_id`) WHERE "restaurant_languages"."is_default" = 1;--> statement-breakpoint
CREATE TABLE `restaurant_stripe_accounts` (
	`restaurant_id` text PRIMARY KEY NOT NULL,
	`stripe_account_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "restaurant_stripe_accounts_status" CHECK("restaurant_stripe_accounts"."status" IN ('pending', 'connected', 'disabled'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `restaurant_stripe_accounts_stripe_account_id_unique` ON `restaurant_stripe_accounts` (`stripe_account_id`);--> statement-breakpoint
CREATE TABLE `restaurant_users` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role_code` text DEFAULT 'staff' NOT NULL,
	`is_driver` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`invite_status` text DEFAULT 'not_sent' NOT NULL,
	`invite_last_error_code` text,
	`invite_last_attempt_at` integer,
	`invite_sent_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "restaurant_users_role" CHECK("restaurant_users"."role_code" IN ('owner', 'admin', 'staff'))
);
--> statement-breakpoint
CREATE INDEX `idx_restaurant_users_user` ON `restaurant_users` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_restaurant_users_restaurant_user` ON `restaurant_users` (`restaurant_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `restaurants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`country_code` text NOT NULL,
	`default_language_code` text DEFAULT 'es' NOT NULL,
	`source_currency` text NOT NULL,
	`timezone` text DEFAULT 'Europe/Madrid' NOT NULL,
	`email_from_name` text,
	`email_from_address` text,
	`email_reply_to` text,
	`legal_name` text,
	`tax_id` text,
	`legal_address` text,
	`data_protection_email` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	CONSTRAINT "restaurants_source_currency_length" CHECK(length("restaurants"."source_currency") = 3),
	CONSTRAINT "restaurants_country_code_iso_alpha_3" CHECK("restaurants"."country_code" GLOB '[A-Z][A-Z][A-Z]')
);
--> statement-breakpoint
CREATE TABLE `translations` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`language_code` text NOT NULL,
	`field` text NOT NULL,
	`value` text NOT NULL,
	`status` text DEFAULT 'ok' NOT NULL,
	`source` text DEFAULT 'machine' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "translations_entity_type" CHECK("translations"."entity_type" IN ('dish', 'category', 'variant_group', 'variant_option', 'ingredient')),
	CONSTRAINT "translations_status" CHECK("translations"."status" IN ('ok', 'pending_update')),
	CONSTRAINT "translations_source" CHECK("translations"."source" IN ('machine', 'manual'))
);
--> statement-breakpoint
CREATE INDEX `idx_translations_lookup` ON `translations` (`entity_type`,`entity_id`,`language_code`);--> statement-breakpoint
CREATE INDEX `idx_translations_pending` ON `translations` (`restaurant_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_translations_lookup` ON `translations` (`entity_type`,`entity_id`,`language_code`,`field`);--> statement-breakpoint
CREATE VIEW `v_dish_promotion_prices` AS 
  SELECT
      d.id        AS dish_id,
      d.branch_id AS branch_id,
      d.price     AS base_price,
      p.id        AS promotion_id,
      p.type      AS promotion_type,
      p.scope     AS promotion_scope,
      p.priority  AS priority,
      CASE
          WHEN p.type = 'percentage_discount'
              THEN CAST(ROUND(d.price * (100 - p.percentage) / 100.0) AS INTEGER)
          WHEN p.type IN ('special_price','daily_menu')
              THEN p.special_price
          WHEN p.type = 'happy_hour'
              THEN COALESCE(p.special_price, CAST(ROUND(d.price * (100 - p.percentage) / 100.0) AS INTEGER))
          ELSE d.price
      END         AS effective_unit_price,
      p.buy_quantity,
      p.paid_quantity,
      p.starts_at,
      p.ends_at,
      p.is_recurring,
      p.recurring_days,
      p.recurring_start_minute,
      p.recurring_end_minute
  FROM dishes d
  JOIN promotions p
    ON p.branch_id = d.branch_id
   AND p.deleted_at IS NULL
   AND p.status = 'active'
   AND p.scope <> 'info'
  WHERE d.deleted_at IS NULL
    AND (
          p.scope = 'branch'
       OR (p.scope = 'dish' AND EXISTS (
            SELECT 1 FROM promotion_targets t
            WHERE t.promotion_id = p.id AND t.target_type = 'dish' AND t.target_id = d.id
          ))
       OR (p.scope = 'category' AND EXISTS (
            SELECT 1 FROM promotion_targets t
            WHERE t.promotion_id = p.id AND t.target_type = 'category' AND t.target_id = d.category_id
          ))
        )
;
--> statement-breakpoint
INSERT INTO `allergens` (`id`, `code`) VALUES
  (1, 'gluten'),
  (2, 'crustaceans'),
  (3, 'eggs'),
  (4, 'fish'),
  (5, 'peanuts'),
  (6, 'soybeans'),
  (7, 'milk'),
  (8, 'nuts'),
  (9, 'celery'),
  (10, 'mustard'),
  (11, 'sesame'),
  (12, 'sulphites'),
  (13, 'lupin'),
  (14, 'molluscs');
--> statement-breakpoint
INSERT INTO `tags` (`id`, `restaurant_id`, `code`, `label`, `is_system`) VALUES
  ('00000000-0000-0000-0000-000000000001', NULL, 'vegan', NULL, 1),
  ('00000000-0000-0000-0000-000000000002', NULL, 'gluten_free', NULL, 1),
  ('00000000-0000-0000-0000-000000000003', NULL, 'lactose_free', NULL, 1),
  ('00000000-0000-0000-0000-000000000004', NULL, 'spicy', NULL, 1),
  ('00000000-0000-0000-0000-000000000005', NULL, 'contains_alcohol', NULL, 1),
  ('00000000-0000-0000-0000-000000000006', NULL, 'new', NULL, 1),
  ('00000000-0000-0000-0000-000000000007', NULL, 'seasonal', NULL, 1);
