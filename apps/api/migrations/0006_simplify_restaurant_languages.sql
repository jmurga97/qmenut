DROP INDEX `ux_restaurant_languages_default`;--> statement-breakpoint
ALTER TABLE `restaurant_languages` DROP COLUMN `is_default`;--> statement-breakpoint
ALTER TABLE `restaurant_languages` DROP COLUMN `is_active`;