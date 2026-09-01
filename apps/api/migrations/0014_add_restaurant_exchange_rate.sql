CREATE TABLE `restaurant_exchange_rates` (
	`restaurant_id` text PRIMARY KEY NOT NULL,
	`rate` text NOT NULL,
	`is_enabled` integer DEFAULT false NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
