CREATE TABLE `claims` (
	`id` text PRIMARY KEY NOT NULL,
	`recall_id` text NOT NULL,
	`product_name` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`estimated_payout_cents` integer NOT NULL,
	`estimated_payout_currency` text NOT NULL,
	`kind` text,
	`issue_description` text,
	`supplier_name` text,
	`supplier_email` text,
	`email_delivery_status` text,
	`response_status` text,
	`heard_back_at` text,
	FOREIGN KEY (`recall_id`) REFERENCES `recalls`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `email_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`provider` text NOT NULL,
	`imap_host` text,
	`imap_port` integer,
	`username` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`brand` text NOT NULL,
	`category` text NOT NULL,
	`receipt_id` text,
	`purchase_date` text,
	`is_recalled` integer DEFAULT false NOT NULL,
	`last_checked_at` text,
	FOREIGN KEY (`receipt_id`) REFERENCES `receipts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `recalls` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text,
	`product_name` text NOT NULL,
	`title` text NOT NULL,
	`details` text NOT NULL,
	`severity` text NOT NULL,
	`published_at` text NOT NULL,
	`source` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`estimated_payout_cents` integer NOT NULL,
	`estimated_payout_currency` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`merchant` text NOT NULL,
	`total_cents` integer NOT NULL,
	`currency` text NOT NULL,
	`purchase_date` text NOT NULL,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`category` text,
	`supplier_warranty_months` integer,
	`supplier_warranty_source` text,
	`supplier_warranty_checked_at` text
);
