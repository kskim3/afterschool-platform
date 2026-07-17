CREATE TABLE `applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`school_id` integer NOT NULL,
	`course_id` integer NOT NULL,
	`student_id` integer NOT NULL,
	`status` text NOT NULL,
	`source` text DEFAULT '문자 URL' NOT NULL,
	`submitted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`tuition_snapshot` integer DEFAULT 0 NOT NULL,
	`textbook_snapshot` integer DEFAULT 0 NOT NULL,
	`materials_snapshot` integer DEFAULT 0 NOT NULL,
	`operating_snapshot` integer DEFAULT 0 NOT NULL,
	`support_amount` integer DEFAULT 0 NOT NULL,
	`vendor_gross` integer,
	`vendor_support` integer,
	`verified_at` text,
	`idempotency_key` text NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `applications_idempotency_key_unique` ON `applications` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `courses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`school_id` integer NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`section` text NOT NULL,
	`grades` text NOT NULL,
	`schedule` text NOT NULL,
	`room` text NOT NULL,
	`tuition` integer DEFAULT 0 NOT NULL,
	`textbook` integer DEFAULT 0 NOT NULL,
	`materials` integer DEFAULT 0 NOT NULL,
	`operating_fee` integer DEFAULT 0 NOT NULL,
	`weeks` integer DEFAULT 0 NOT NULL,
	`capacity` integer DEFAULT 0 NOT NULL,
	`applicants` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT '모집중' NOT NULL,
	`selection_method` text DEFAULT '선착순' NOT NULL,
	`instructor` text DEFAULT '' NOT NULL,
	`accent` text DEFAULT 'mint' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `deliveries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`school_id` integer NOT NULL,
	`title` text NOT NULL,
	`recipient` text NOT NULL,
	`channel` text NOT NULL,
	`status` text NOT NULL,
	`sent_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `operation_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `refunds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`school_id` integer NOT NULL,
	`student_name` text NOT NULL,
	`course_name` text NOT NULL,
	`amount` integer NOT NULL,
	`reason` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `schools` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`district` text NOT NULL,
	`school_type` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `schools_code_unique` ON `schools` (`code`);--> statement-breakpoint
CREATE TABLE `students` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`school_id` integer NOT NULL,
	`name` text NOT NULL,
	`grade` integer NOT NULL,
	`class_name` text NOT NULL,
	`student_number` integer NOT NULL,
	`guardian_phone` text NOT NULL,
	`support_type` text,
	`support_limit` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE no action
);
