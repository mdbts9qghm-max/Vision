CREATE TABLE `day_focus` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`text` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `day_focus_date_unique` ON `day_focus` (`date`);