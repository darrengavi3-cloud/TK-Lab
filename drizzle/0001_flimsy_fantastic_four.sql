CREATE TABLE `catalogue_aliases` (
	`alias` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `catalogue_people`(`id`) ON UPDATE no action ON DELETE no action
);
