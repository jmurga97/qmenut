ALTER TABLE `dishes` ADD `combo_enabled` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `dishes` ADD `combo_price` integer CONSTRAINT "dishes_combo_price" CHECK(`combo_price` IS NULL OR `combo_price` >= 0);
--> statement-breakpoint
ALTER TABLE `dishes` ADD `combo_description` text
  CONSTRAINT "dishes_combo_description" CHECK(`combo_description` IS NULL OR length(`combo_description`) <= 2000)
  CONSTRAINT "dishes_combo_required_values" CHECK(`combo_enabled` = 0 OR (`combo_price` IS NOT NULL AND `combo_description` IS NOT NULL AND length(trim(`combo_description`)) > 0));
