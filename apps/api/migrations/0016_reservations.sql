CREATE TABLE `reservation_closures` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text NOT NULL,
	`date` text NOT NULL,
	`start_minute` integer,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `restaurant_users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_reservation_closures_slot` ON `reservation_closures` (`branch_id`,`date`,`start_minute`) WHERE "reservation_closures"."start_minute" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_reservation_closures_day` ON `reservation_closures` (`branch_id`,`date`) WHERE "reservation_closures"."start_minute" IS NULL;--> statement-breakpoint
CREATE TABLE `reservation_settings` (
	`branch_id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`is_enabled` integer DEFAULT false NOT NULL,
	`slot_capacity` integer NOT NULL,
	`online_party_limit` integer DEFAULT 8 NOT NULL,
	`window_days` integer DEFAULT 30 NOT NULL,
	`lead_time_minutes` integer DEFAULT 120 NOT NULL,
	`response_time_minutes` integer DEFAULT 720 NOT NULL,
	`check_before_minutes` integer DEFAULT 120 NOT NULL,
	`check_deadline_minutes` integer DEFAULT 45 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "reservation_settings_capacity" CHECK("reservation_settings"."slot_capacity" >= 1),
	CONSTRAINT "reservation_settings_party_limit" CHECK("reservation_settings"."online_party_limit" >= 1)
);
--> statement-breakpoint
CREATE TABLE `reservation_slots` (
	`branch_id` text NOT NULL,
	`weekday` integer NOT NULL,
	`start_minute` integer NOT NULL,
	PRIMARY KEY(`branch_id`, `weekday`, `start_minute`),
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "reservation_slots_weekday" CHECK("reservation_slots"."weekday" BETWEEN 0 AND 6),
	CONSTRAINT "reservation_slots_start_minute" CHECK("reservation_slots"."start_minute" BETWEEN 0 AND 1439)
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`slot_date` text NOT NULL,
	`slot_minute` integer NOT NULL,
	`starts_at` integer NOT NULL,
	`party_size` integer NOT NULL,
	`guest_name` text,
	`guest_phone` text,
	`guest_email` text,
	`guest_language` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`auto_accepted` integer DEFAULT false NOT NULL,
	`cancelled_by` text,
	`handled_by` text,
	`handled_at` integer,
	`respond_by` integer NOT NULL,
	`check_sent_at` integer,
	`consent_at` integer NOT NULL,
	`anonymized_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`handled_by`) REFERENCES `restaurant_users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "reservations_party_size" CHECK("reservations"."party_size" >= 1),
	CONSTRAINT "reservations_status" CHECK("reservations"."status" IN ('pending', 'accepted', 'confirmed', 'unconfirmed', 'declined', 'cancelled')),
	CONSTRAINT "reservations_cancelled_by" CHECK("reservations"."cancelled_by" IS NULL OR "reservations"."cancelled_by" IN ('guest', 'staff'))
);
--> statement-breakpoint
CREATE INDEX `idx_reservations_slot` ON `reservations` (`branch_id`,`slot_date`,`slot_minute`,`status`);--> statement-breakpoint
CREATE INDEX `idx_reservations_guest` ON `reservations` (`branch_id`,`guest_email`);--> statement-breakpoint
CREATE INDEX `idx_reservations_respond_by` ON `reservations` (`status`,`respond_by`);--> statement-breakpoint
CREATE INDEX `idx_reservations_starts_at` ON `reservations` (`status`,`starts_at`);