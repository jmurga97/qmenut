CREATE TABLE `admin_save_operations` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`fingerprint` text NOT NULL,
	`entity_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `image_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`entity_id` text NOT NULL,
	`purpose` text NOT NULL,
	`revision` text NOT NULL,
	`images` text NOT NULL,
	`status` text NOT NULL,
	`error` text,
	`invalidated_at` integer,
	`next_attempt_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_image_assignment_target` ON `image_assignments` (`restaurant_id`,`entity_id`,`purpose`);--> statement-breakpoint
CREATE INDEX `idx_image_assignment_due` ON `image_assignments` (`status`,`next_attempt_at`);--> statement-breakpoint
CREATE INDEX `idx_image_assignment_branch` ON `image_assignments` (`restaurant_id`,`branch_id`);