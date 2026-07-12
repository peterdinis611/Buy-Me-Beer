ALTER TABLE `users` ADD COLUMN `thank_you_message` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `membership_tiers` ADD COLUMN `billing_interval` text DEFAULT 'one_time' NOT NULL;
--> statement-breakpoint
ALTER TABLE `supports` ADD COLUMN `asset_id` text REFERENCES `assets`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `assets` ADD COLUMN `description` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `assets` ADD COLUMN `price` integer DEFAULT 500 NOT NULL;
--> statement-breakpoint
ALTER TABLE `assets` ADD COLUMN `active` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`creator_id` text NOT NULL,
	`tier_id` text NOT NULL,
	`supporter_name` text NOT NULL,
	`supporter_email` text DEFAULT '' NOT NULL,
	`stripe_subscription_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`current_period_end` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tier_id`) REFERENCES `membership_tiers`(`id`) ON UPDATE no action ON DELETE cascade
);
