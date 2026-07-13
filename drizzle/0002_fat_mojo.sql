CREATE TABLE `coach_settings` (
	`id` text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	`weekly_km_base` real DEFAULT 15 NOT NULL,
	`progression_pct` real DEFAULT 7 NOT NULL,
	`deload_every_weeks` integer DEFAULT 4 NOT NULL,
	`weekly_gym_target` integer DEFAULT 3 NOT NULL,
	`start_week` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `planned_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`kind` text NOT NULL,
	`target_km` real,
	`optional` integer DEFAULT false NOT NULL,
	`reason` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `planned_sessions_date_unique` ON `planned_sessions` (`date`);--> statement-breakpoint
CREATE TABLE `shifts` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`type` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shifts_date_unique` ON `shifts` (`date`);--> statement-breakpoint
ALTER TABLE `workouts` ADD `distance_km` real;