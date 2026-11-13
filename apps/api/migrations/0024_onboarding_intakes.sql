CREATE TABLE `onboarding_intakes` (
	`id` text PRIMARY KEY NOT NULL,
	`country_code` text NOT NULL,
	`label` text NOT NULL,
	`contact_email` text NOT NULL,
	`created_by` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`data_json` text,
	`sent_at` integer,
	`submitted_at` integer,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "onboarding_country" CHECK("onboarding_intakes"."country_code" IN ('ESP', 'VEN')),
	CONSTRAINT "onboarding_status" CHECK("onboarding_intakes"."status" IN ('pending', 'submitted', 'used'))
);
