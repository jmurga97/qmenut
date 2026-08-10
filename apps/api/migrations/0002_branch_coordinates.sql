PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_branches` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`latitude` real,
	`longitude` real,
	`phone` text,
	`whatsapp` text,
	`social_links_json` text,
	`custom_domain` text,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`plan_code` text DEFAULT 'basic' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "branches_currency_length" CHECK(length("__new_branches"."currency") = 3),
	CONSTRAINT "branches_plan_code" CHECK("__new_branches"."plan_code" IN ('basic', 'business')),
	CONSTRAINT "branches_coordinates_pair" CHECK(("__new_branches"."latitude" IS NULL AND "__new_branches"."longitude" IS NULL) OR ("__new_branches"."latitude" IS NOT NULL AND "__new_branches"."longitude" IS NOT NULL)),
	CONSTRAINT "branches_latitude_range" CHECK("__new_branches"."latitude" IS NULL OR "__new_branches"."latitude" BETWEEN -90 AND 90),
	CONSTRAINT "branches_longitude_range" CHECK("__new_branches"."longitude" IS NULL OR "__new_branches"."longitude" BETWEEN -180 AND 180)
);--> statement-breakpoint
INSERT INTO `__new_branches` (
	`id`,
	`restaurant_id`,
	`name`,
	`address`,
	`latitude`,
	`longitude`,
	`phone`,
	`whatsapp`,
	`social_links_json`,
	`custom_domain`,
	`currency`,
	`plan_code`,
	`is_active`,
	`created_at`,
	`updated_at`,
	`deleted_at`
)
SELECT
	`id`,
	`restaurant_id`,
	`name`,
	`address`,
	NULL,
	NULL,
	`phone`,
	`whatsapp`,
	`social_links_json`,
	`custom_domain`,
	`currency`,
	`plan_code`,
	`is_active`,
	`created_at`,
	`updated_at`,
	`deleted_at`
FROM `branches`;--> statement-breakpoint
DROP TABLE `branches`;--> statement-breakpoint
ALTER TABLE `__new_branches` RENAME TO `branches`;--> statement-breakpoint
CREATE INDEX `idx_branches_restaurant` ON `branches` (`restaurant_id`) WHERE "branches"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_branches_custom_domain` ON `branches` (`custom_domain`) WHERE "branches"."custom_domain" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_branches_id_restaurant` ON `branches` (`id`,`restaurant_id`);--> statement-breakpoint
PRAGMA foreign_keys=ON;
