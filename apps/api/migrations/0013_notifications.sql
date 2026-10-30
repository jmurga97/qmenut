CREATE TABLE `notification_recipients` (
	`notification_id` text NOT NULL,
	`membership_id` text NOT NULL,
	`read_at` integer,
	PRIMARY KEY(`notification_id`, `membership_id`),
	FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`membership_id`) REFERENCES `restaurant_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_notification_recipients_member` ON `notification_recipients` (`membership_id`,`read_at`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`branch_id` text,
	`type` text NOT NULL,
	`subject_id` text,
	`facts_json` text DEFAULT '{}' NOT NULL,
	`actionable` integer DEFAULT false NOT NULL,
	`handled_at` integer,
	`handled_by` text,
	`handled_outcome` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`handled_by`) REFERENCES `restaurant_users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_notifications_subject` ON `notifications` (`type`,`subject_id`);--> statement-breakpoint
CREATE INDEX `idx_notifications_restaurant_branch` ON `notifications` (`restaurant_id`,`branch_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_notifications_expires` ON `notifications` (`expires_at`);--> statement-breakpoint
CREATE TABLE `push_devices` (
	`id` text PRIMARY KEY NOT NULL,
	`membership_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`language` text NOT NULL,
	`branch_ids` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`membership_id`) REFERENCES `restaurant_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_devices_endpoint_unique` ON `push_devices` (`endpoint`);--> statement-breakpoint
CREATE INDEX `idx_push_devices_member` ON `push_devices` (`membership_id`);