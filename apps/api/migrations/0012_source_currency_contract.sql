PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_restaurants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`country_code` text NOT NULL,
	`default_language_code` text DEFAULT 'es' NOT NULL,
	`source_currency` text NOT NULL,
	`timezone` text DEFAULT 'Europe/Madrid' NOT NULL,
	`email_from_name` text,
	`email_from_address` text,
	`email_reply_to` text,
	`legal_name` text,
	`tax_id` text,
	`legal_address` text,
	`data_protection_email` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	CONSTRAINT "restaurants_source_currency_length" CHECK(length("__new_restaurants"."source_currency") = 3)
);
--> statement-breakpoint
INSERT INTO `__new_restaurants`("id", "name", "country_code", "default_language_code", "source_currency", "timezone", "email_from_name", "email_from_address", "email_reply_to", "legal_name", "tax_id", "legal_address", "data_protection_email", "created_at", "updated_at", "deleted_at") SELECT "id", "name", "country_code", "default_language_code", "default_currency", "timezone", "email_from_name", "email_from_address", "email_reply_to", "legal_name", "tax_id", "legal_address", "data_protection_email", "created_at", "updated_at", "deleted_at" FROM `restaurants`;--> statement-breakpoint
DROP TABLE `restaurants`;--> statement-breakpoint
ALTER TABLE `__new_restaurants` RENAME TO `restaurants`;--> statement-breakpoint
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
	`logo_url` text,
	`google_place_id` text,
	`google_reviews_enabled` integer DEFAULT false NOT NULL,
	`custom_domain` text,
	`plan_code` text DEFAULT 'basic' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "branches_plan_code" CHECK("__new_branches"."plan_code" IN ('basic', 'business')),
	CONSTRAINT "branches_coordinates_pair" CHECK(("__new_branches"."latitude" IS NULL AND "__new_branches"."longitude" IS NULL) OR ("__new_branches"."latitude" IS NOT NULL AND "__new_branches"."longitude" IS NOT NULL)),
	CONSTRAINT "branches_latitude_range" CHECK("__new_branches"."latitude" IS NULL OR "__new_branches"."latitude" BETWEEN -90 AND 90),
	CONSTRAINT "branches_longitude_range" CHECK("__new_branches"."longitude" IS NULL OR "__new_branches"."longitude" BETWEEN -180 AND 180)
);
--> statement-breakpoint
INSERT INTO `__new_branches`("id", "restaurant_id", "name", "address", "latitude", "longitude", "phone", "whatsapp", "social_links_json", "logo_url", "google_place_id", "google_reviews_enabled", "custom_domain", "plan_code", "is_active", "created_at", "updated_at", "deleted_at") SELECT "id", "restaurant_id", "name", "address", "latitude", "longitude", "phone", "whatsapp", "social_links_json", "logo_url", "google_place_id", "google_reviews_enabled", "custom_domain", "plan_code", "is_active", "created_at", "updated_at", "deleted_at" FROM `branches`;--> statement-breakpoint
DROP TABLE `branches`;--> statement-breakpoint
ALTER TABLE `__new_branches` RENAME TO `branches`;--> statement-breakpoint
CREATE INDEX `idx_branches_restaurant` ON `branches` (`restaurant_id`) WHERE "branches"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_branches_custom_domain` ON `branches` (`custom_domain`) WHERE "branches"."custom_domain" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_branches_id_restaurant` ON `branches` (`id`,`restaurant_id`);--> statement-breakpoint
CREATE TABLE `__new_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`customer_id` text,
	`mode` text NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`delivery_address` text,
	`delivery_zone_id` text,
	`delivery_fee` integer DEFAULT 0 NOT NULL,
	`subtotal` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`currency` text NOT NULL,
	`desired_time` integer,
	`kitchen_note` text,
	`driver_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`delivery_zone_id`) REFERENCES `delivery_zones`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`driver_id`) REFERENCES `restaurant_users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`branch_id`,`restaurant_id`) REFERENCES `branches`(`id`,`restaurant_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "orders_mode" CHECK("__new_orders"."mode" IN ('pickup', 'delivery')),
	CONSTRAINT "orders_status" CHECK("__new_orders"."status" IN ('received', 'preparing', 'ready', 'on_the_way', 'delivered', 'canceled')),
	CONSTRAINT "orders_delivery_fee" CHECK("__new_orders"."delivery_fee" >= 0),
	CONSTRAINT "orders_subtotal" CHECK("__new_orders"."subtotal" >= 0),
	CONSTRAINT "orders_total" CHECK("__new_orders"."total" >= 0),
	CONSTRAINT "orders_currency_length" CHECK(length("__new_orders"."currency") = 3)
);
--> statement-breakpoint
INSERT INTO `__new_orders`("id", "restaurant_id", "branch_id", "customer_id", "mode", "status", "delivery_address", "delivery_zone_id", "delivery_fee", "subtotal", "total", "currency", "desired_time", "kitchen_note", "driver_id", "created_at", "updated_at") SELECT "id", "restaurant_id", "branch_id", "customer_id", "mode", "status", "delivery_address", "delivery_zone_id", "delivery_fee", "subtotal", "total", "currency", "desired_time", "kitchen_note", "driver_id", "created_at", "updated_at" FROM `orders`;--> statement-breakpoint
DROP TABLE `orders`;--> statement-breakpoint
ALTER TABLE `__new_orders` RENAME TO `orders`;--> statement-breakpoint
CREATE INDEX `idx_orders_branch_status` ON `orders` (`branch_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_orders_customer` ON `orders` (`customer_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_orders_driver` ON `orders` (`driver_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_orders_id_restaurant` ON `orders` (`id`,`restaurant_id`);--> statement-breakpoint
CREATE TABLE `__new_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`order_id` text NOT NULL,
	`stripe_payment_intent_id` text NOT NULL,
	`status` text DEFAULT 'requires_payment' NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`order_id`,`restaurant_id`) REFERENCES `orders`(`id`,`restaurant_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "payments_status" CHECK("__new_payments"."status" IN ('requires_payment', 'processing', 'succeeded', 'failed', 'refunded')),
	CONSTRAINT "payments_amount" CHECK("__new_payments"."amount" >= 0),
	CONSTRAINT "payments_currency_length" CHECK(length("__new_payments"."currency") = 3)
);
--> statement-breakpoint
INSERT INTO `__new_payments`("id", "restaurant_id", "order_id", "stripe_payment_intent_id", "status", "amount", "currency", "created_at", "updated_at") SELECT "id", "restaurant_id", "order_id", "stripe_payment_intent_id", "status", "amount", "currency", "created_at", "updated_at" FROM `payments`;--> statement-breakpoint
DROP TABLE `payments`;--> statement-breakpoint
ALTER TABLE `__new_payments` RENAME TO `payments`;--> statement-breakpoint
CREATE INDEX `idx_payments_order` ON `payments` (`order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payments_intent` ON `payments` (`stripe_payment_intent_id`);--> statement-breakpoint
PRAGMA foreign_keys=ON;
