-- Custom SQL migration: materialize the PostHog analytics dimensions on the two existing
-- daily tables. Drizzle Kit cannot generate either step safely: an ADD COLUMN becomes a
-- table recreate that copies columns which do not exist yet, and the PK recreate qualifies
-- CHECK expressions as "__new_table"."column", which modern SQLite rejects on RENAME.
-- Columns are appended with defaults (SQLite backfills the existing rows, preserving
-- historical data under the `legacy` dimensions) and the tables are then rebuilt in place.

ALTER TABLE `menu_view_daily` ADD `visits` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `menu_view_daily` ADD `display_mode` text DEFAULT 'legacy' NOT NULL;
--> statement-breakpoint
ALTER TABLE `dish_view_daily` ADD `language_code` text DEFAULT 'legacy' NOT NULL;
--> statement-breakpoint
ALTER TABLE `dish_view_daily` ADD `source` text DEFAULT 'legacy' NOT NULL;
--> statement-breakpoint
ALTER TABLE `dish_view_daily` ADD `visits_with_open` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_dish_view_daily` (
	`dish_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`day` text NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`language_code` text DEFAULT 'legacy' NOT NULL,
	`source` text DEFAULT 'legacy' NOT NULL,
	`visits_with_open` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`dish_id`, `branch_id`, `day`, `language_code`, `source`),
	FOREIGN KEY (`dish_id`) REFERENCES `dishes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "dish_view_daily_views" CHECK("views" >= 0),
	CONSTRAINT "dish_view_daily_visits_with_open" CHECK("visits_with_open" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_dish_view_daily`("dish_id", "branch_id", "day", "views", "language_code", "source", "visits_with_open") SELECT "dish_id", "branch_id", "day", "views", "language_code", "source", "visits_with_open" FROM `dish_view_daily`;
--> statement-breakpoint
DROP TABLE `dish_view_daily`;
--> statement-breakpoint
ALTER TABLE `__new_dish_view_daily` RENAME TO `dish_view_daily`;
--> statement-breakpoint
CREATE INDEX `idx_dish_view_daily_branch` ON `dish_view_daily` (`branch_id`,`day`);
--> statement-breakpoint
CREATE TABLE `__new_menu_view_daily` (
	`branch_id` text NOT NULL,
	`day` text NOT NULL,
	`language_code` text DEFAULT 'all' NOT NULL,
	`source` text DEFAULT 'all' NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`visits` integer DEFAULT 0 NOT NULL,
	`display_mode` text DEFAULT 'legacy' NOT NULL,
	PRIMARY KEY(`branch_id`, `day`, `language_code`, `source`, `display_mode`),
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "menu_view_daily_views" CHECK("views" >= 0),
	CONSTRAINT "menu_view_daily_visits" CHECK("visits" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_menu_view_daily`("branch_id", "day", "language_code", "source", "views", "visits", "display_mode") SELECT "branch_id", "day", "language_code", "source", "views", "visits", "display_mode" FROM `menu_view_daily`;
--> statement-breakpoint
DROP TABLE `menu_view_daily`;
--> statement-breakpoint
ALTER TABLE `__new_menu_view_daily` RENAME TO `menu_view_daily`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
