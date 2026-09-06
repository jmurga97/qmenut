CREATE TABLE `image_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`canonical_url` text NOT NULL,
	`url` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`format` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_image_variants_url` ON `image_variants` (`url`);--> statement-breakpoint
CREATE INDEX `idx_image_variants_canonical` ON `image_variants` (`canonical_url`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_image_variants_canonical_width_format` ON `image_variants` (`canonical_url`,`width`,`format`);