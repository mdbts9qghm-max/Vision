ALTER TABLE `habit_completions` ADD `status` text DEFAULT 'done' NOT NULL;--> statement-breakpoint
ALTER TABLE `habit_completions` ADD `skip_reason` text;--> statement-breakpoint
ALTER TABLE `habits` ADD `cue` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `habits` ADD `stacked_on` text;--> statement-breakpoint
ALTER TABLE `habits` ADD `min_value` real;--> statement-breakpoint
ALTER TABLE `habits` ADD `category` text;--> statement-breakpoint
ALTER TABLE `habits` ADD `reminder` text;