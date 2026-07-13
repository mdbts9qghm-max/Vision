CREATE TABLE `readiness_checks` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`score` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `readiness_checks_date_unique` ON `readiness_checks` (`date`);