CREATE TABLE `fasting_settings` (
	`id` text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	`rotation_start` text,
	`updated_at` text NOT NULL
);
