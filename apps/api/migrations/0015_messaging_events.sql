CREATE TABLE `messaging_events` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`ref` text NOT NULL,
	`message_id` text NOT NULL,
	`direction` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT '' NOT NULL,
	`button_id` text,
	`text` text,
	`error_code` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "messaging_events_direction" CHECK("messaging_events"."direction" IN ('in', 'out'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `messaging_events_dedupe_unique` ON `messaging_events` (`message_id`,`type`,`status`);--> statement-breakpoint
CREATE INDEX `messaging_events_conversation_idx` ON `messaging_events` (`conversation_id`,`created_at`);