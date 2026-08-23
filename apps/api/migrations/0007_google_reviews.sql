ALTER TABLE `branches` ADD `google_place_id` text;--> statement-breakpoint
ALTER TABLE `branches` ADD `google_reviews_enabled` integer DEFAULT false NOT NULL;