ALTER TABLE `users` ADD `phone` text;--> statement-breakpoint
ALTER TABLE `users` ADD `marketing_consent_at` integer;--> statement-breakpoint
ALTER TABLE `branch_subscriptions` ADD `founder` integer DEFAULT false NOT NULL;