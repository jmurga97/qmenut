CREATE TABLE `translation_locks` (
	`restaurant_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`field` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`restaurant_id`, `entity_type`, `entity_id`, `field`),
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "translation_locks_entity_type" CHECK("translation_locks"."entity_type" IN ('dish', 'category', 'variant_group', 'variant_option', 'ingredient', 'promotion', 'branch', 'reward'))
);
