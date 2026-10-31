-- Drizzle Kit qualifies the checks with the temporary `__new_*` name, which plain SQLite rejects
-- on the rename; bare column names behave the same and survive it. Neither table has child
-- foreign keys, so the drops cascade nowhere on D1.
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_reservations` (
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
	`cancelled_by` text,
	`check_sent_at` integer,
	`consent_at` integer NOT NULL,
	`anonymized_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "reservations_party_size" CHECK("party_size" >= 1),
	CONSTRAINT "reservations_status" CHECK("status" IN ('pending', 'confirmed', 'cancelled')),
	CONSTRAINT "reservations_cancelled_by" CHECK("cancelled_by" IS NULL OR "cancelled_by" IN ('guest', 'staff'))
);
--> statement-breakpoint
INSERT INTO `__new_reservations`("id", "restaurant_id", "branch_id", "slot_date", "slot_minute", "starts_at", "party_size", "guest_name", "guest_phone", "guest_email", "guest_language", "status", "cancelled_by", "check_sent_at", "consent_at", "anonymized_at", "created_at", "updated_at") SELECT "id", "restaurant_id", "branch_id", "slot_date", "slot_minute", "starts_at", "party_size", "guest_name", "guest_phone", "guest_email", "guest_language", "status", "cancelled_by", "check_sent_at", "consent_at", "anonymized_at", "created_at", "updated_at" FROM `reservations`;--> statement-breakpoint
DROP TABLE `reservations`;--> statement-breakpoint
ALTER TABLE `__new_reservations` RENAME TO `reservations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_reservations_slot` ON `reservations` (`branch_id`,`slot_date`,`slot_minute`,`status`);--> statement-breakpoint
CREATE INDEX `idx_reservations_guest` ON `reservations` (`branch_id`,`guest_email`);--> statement-breakpoint
CREATE INDEX `idx_reservations_starts_at` ON `reservations` (`status`,`starts_at`);--> statement-breakpoint
CREATE TABLE `__new_reservation_settings` (
	`branch_id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`is_enabled` integer DEFAULT false NOT NULL,
	`slot_capacity` integer NOT NULL,
	`online_party_limit` integer DEFAULT 8 NOT NULL,
	`window_days` integer DEFAULT 30 NOT NULL,
	`lead_time_minutes` integer DEFAULT 120 NOT NULL,
	`check_before_minutes` integer DEFAULT 1440 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "reservation_settings_capacity" CHECK("slot_capacity" >= 1),
	CONSTRAINT "reservation_settings_party_limit" CHECK("online_party_limit" >= 1)
);
--> statement-breakpoint
INSERT INTO `__new_reservation_settings`("branch_id", "restaurant_id", "is_enabled", "slot_capacity", "online_party_limit", "window_days", "lead_time_minutes", "check_before_minutes", "updated_at") SELECT "branch_id", "restaurant_id", "is_enabled", "slot_capacity", "online_party_limit", "window_days", "lead_time_minutes", "check_before_minutes", "updated_at" FROM `reservation_settings`;--> statement-breakpoint
DROP TABLE `reservation_settings`;--> statement-breakpoint
ALTER TABLE `__new_reservation_settings` RENAME TO `reservation_settings`;