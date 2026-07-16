CREATE TABLE `checkins` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`mood` integer,
	`energy` integer,
	`stress` integer,
	`note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `checkins_date_unique` ON `checkins` (`date`);--> statement-breakpoint
CREATE TABLE `weekly_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`week_start` text NOT NULL,
	`went_well` text,
	`to_improve` text,
	`focus_next` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `weekly_reviews_week_start_unique` ON `weekly_reviews` (`week_start`);