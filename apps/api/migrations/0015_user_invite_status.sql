ALTER TABLE `restaurant_users` ADD `invite_status` text DEFAULT 'not_sent' NOT NULL;--> statement-breakpoint
ALTER TABLE `restaurant_users` ADD `invite_last_error_code` text;--> statement-breakpoint
ALTER TABLE `restaurant_users` ADD `invite_last_attempt_at` integer;--> statement-breakpoint
ALTER TABLE `restaurant_users` ADD `invite_sent_at` integer;