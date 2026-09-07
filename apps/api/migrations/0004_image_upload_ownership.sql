CREATE TABLE `image_uploads` (
	`upload_id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`purpose` text NOT NULL,
	`created_at` integer NOT NULL
);
