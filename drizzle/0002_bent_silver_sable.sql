CREATE TABLE `catalogue_reader_links` (
	`appointment_id` text PRIMARY KEY NOT NULL,
	`fangzhen_id` text NOT NULL,
	FOREIGN KEY (`appointment_id`) REFERENCES `catalogue_appointments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalogue_reader_links_fangzhen_id_unique` ON `catalogue_reader_links` (`fangzhen_id`);