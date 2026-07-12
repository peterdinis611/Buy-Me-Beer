ALTER TABLE `users` ADD COLUMN `primary_color` text DEFAULT '#F5A623' NOT NULL;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `cover_image_url` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `discord_webhook_url` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `slack_webhook_url` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `supports` ADD COLUMN `is_gift` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `supports` ADD COLUMN `gift_recipient_name` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `supports` ADD COLUMN `gift_message` text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`visibility` text DEFAULT 'public' NOT NULL,
	`published` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `commissions` (
	`id` text PRIMARY KEY NOT NULL,
	`creator_id` text NOT NULL,
	`client_name` text NOT NULL,
	`client_email` text DEFAULT '' NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`price` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`support_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`support_id`) REFERENCES `supports`(`id`) ON UPDATE no action ON DELETE set null
);
