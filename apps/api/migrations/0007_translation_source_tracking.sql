ALTER TABLE `translations` ADD `source_text` text;--> statement-breakpoint
ALTER TABLE `translations` ADD `is_manual` integer DEFAULT false NOT NULL;