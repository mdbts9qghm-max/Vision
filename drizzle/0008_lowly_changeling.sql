CREATE TABLE `whoop_connection` (
	`id` text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`expires_at` text NOT NULL,
	`scope` text,
	`last_sync_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
