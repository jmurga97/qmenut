PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_translations` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`language_code` text NOT NULL,
	`field` text NOT NULL,
	`value` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "translations_entity_type" CHECK("entity_type" IN ('dish', 'category', 'variant_group', 'variant_option', 'ingredient'))
);
--> statement-breakpoint
INSERT INTO `__new_translations`("id", "restaurant_id", "entity_type", "entity_id", "language_code", "field", "value", "created_at", "updated_at") SELECT "id", "restaurant_id", "entity_type", "entity_id", "language_code", "field", "value", "created_at", "updated_at" FROM `translations`;--> statement-breakpoint
DROP TABLE `translations`;--> statement-breakpoint
ALTER TABLE `__new_translations` RENAME TO `translations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_translations_lookup` ON `translations` (`entity_type`,`entity_id`,`language_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_translations_lookup` ON `translations` (`entity_type`,`entity_id`,`language_code`,`field`);
