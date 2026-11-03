ALTER TABLE `referral_batches` ADD `scheduled_at` integer;--> statement-breakpoint
CREATE INDEX `idx_referral_batches_schedule` ON `referral_batches` (`status`,`scheduled_at`);--> statement-breakpoint
ALTER TABLE `referral_campaigns` ADD `import_label` text;--> statement-breakpoint
ALTER TABLE `referral_campaigns` ADD `daily_limit` integer;