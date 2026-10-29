CREATE TABLE `loyalty_stamp_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`restaurant_id` text NOT NULL,
	`branch_id` text,
	`claimed_quantity` integer NOT NULL,
	`accepted_quantity` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`auto_accepted` integer DEFAULT false NOT NULL,
	`handled_by` text,
	`handled_at` integer,
	`transaction_id` integer,
	`visit_id` integer,
	`outcome_seen_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`handled_by`) REFERENCES `restaurant_users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "loyalty_stamp_requests_claimed" CHECK("loyalty_stamp_requests"."claimed_quantity" BETWEEN 1 AND 10),
	CONSTRAINT "loyalty_stamp_requests_status" CHECK("loyalty_stamp_requests"."status" IN ('pending', 'accepted', 'declined', 'cancelled'))
);
--> statement-breakpoint
CREATE INDEX `idx_loyalty_stamp_requests_branch` ON `loyalty_stamp_requests` (`restaurant_id`,`branch_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_loyalty_stamp_requests_customer` ON `loyalty_stamp_requests` (`customer_id`,`restaurant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_loyalty_stamp_requests_status` ON `loyalty_stamp_requests` (`status`,`created_at`);