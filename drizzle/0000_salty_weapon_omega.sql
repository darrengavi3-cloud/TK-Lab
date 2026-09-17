CREATE TABLE `catalogue_appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`office_id` text,
	`office_name` text NOT NULL,
	`nature` text NOT NULL,
	`start_year` integer,
	`end_year` integer,
	`date_text` text NOT NULL,
	`duplicate_of` text,
	FOREIGN KEY (`id`) REFERENCES `catalogue_records`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`person_id`) REFERENCES `catalogue_people`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "catalogue_year_order" CHECK("catalogue_appointments"."start_year" is null or "catalogue_appointments"."end_year" is null or "catalogue_appointments"."start_year"<="catalogue_appointments"."end_year")
);
--> statement-breakpoint
CREATE INDEX `idx_catalogue_person_appointments` ON `catalogue_appointments` (`person_id`);--> statement-breakpoint
CREATE TABLE `catalogue_commits` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`request_id` text NOT NULL,
	`request_hash` text NOT NULL,
	`actor` text NOT NULL,
	`reason` text NOT NULL,
	`at` text NOT NULL,
	`guard` integer NOT NULL,
	CONSTRAINT "catalogue_cas_guard" CHECK("catalogue_commits"."guard"=1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalogue_commits_request_id_unique` ON `catalogue_commits` (`request_id`);--> statement-breakpoint
CREATE TABLE `catalogue_evidence` (
	`id` text NOT NULL,
	`source_id` text NOT NULL,
	`source_version` integer NOT NULL,
	`role` text NOT NULL,
	`note` text NOT NULL,
	PRIMARY KEY(`id`, `source_id`, `source_version`, `role`),
	FOREIGN KEY (`id`) REFERENCES `catalogue_records`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_id`) REFERENCES `catalogue_sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_catalogue_cited_source` ON `catalogue_evidence` (`source_id`,`source_version`);--> statement-breakpoint
CREATE TABLE `catalogue_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`original_hash` text NOT NULL,
	`mapping` text NOT NULL,
	`mapping_hash` text NOT NULL,
	`state` text NOT NULL,
	`total` integer NOT NULL,
	`at` text NOT NULL,
	`commit_seq` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_catalogue_import_identity` ON `catalogue_imports` (`original_hash`,`mapping_hash`);--> statement-breakpoint
CREATE TABLE `catalogue_objects` (
	`hash` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`bytes` integer NOT NULL,
	`media_type` text NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `catalogue_people` (
	`id` text PRIMARY KEY NOT NULL,
	`aliases` text NOT NULL,
	`alias_publication` text NOT NULL,
	FOREIGN KEY (`id`) REFERENCES `catalogue_records`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `catalogue_publication_events` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`request_id` text NOT NULL,
	`release_id` text NOT NULL,
	`previous_id` text,
	`actor` text NOT NULL,
	`at` text NOT NULL,
	`action` text NOT NULL,
	`digest` text NOT NULL,
	FOREIGN KEY (`release_id`) REFERENCES `catalogue_releases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalogue_publication_events_request_id_unique` ON `catalogue_publication_events` (`request_id`);--> statement-breakpoint
CREATE TABLE `catalogue_records` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`version` integer NOT NULL,
	`commit_seq` integer NOT NULL,
	`name` text NOT NULL,
	`assessment` text NOT NULL,
	`visibility` text NOT NULL,
	FOREIGN KEY (`commit_seq`) REFERENCES `catalogue_commits`(`seq`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "catalogue_kind" CHECK("catalogue_records"."kind" in ('person','appointment','source'))
);
--> statement-breakpoint
CREATE INDEX `idx_catalogue_kind_name` ON `catalogue_records` (`kind`,`name`);--> statement-breakpoint
CREATE TABLE `catalogue_releases` (
	`id` text PRIMARY KEY NOT NULL,
	`watermark` integer NOT NULL,
	`digest` text NOT NULL,
	`state` text NOT NULL,
	`code_id` text NOT NULL,
	`manifest` text NOT NULL,
	`at` text NOT NULL,
	`actor` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `catalogue_revisions` (
	`id` text NOT NULL,
	`version` integer NOT NULL,
	`commit_seq` integer NOT NULL,
	`payload` text NOT NULL,
	`digest` text NOT NULL,
	PRIMARY KEY(`id`, `version`),
	FOREIGN KEY (`id`) REFERENCES `catalogue_records`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`commit_seq`) REFERENCES `catalogue_commits`(`seq`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_catalogue_snapshot` ON `catalogue_revisions` (`commit_seq`,`id`);--> statement-breakpoint
CREATE TABLE `catalogue_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `catalogue_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`edition` text NOT NULL,
	`locator` text NOT NULL,
	`scope` text NOT NULL,
	FOREIGN KEY (`id`) REFERENCES `catalogue_records`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `catalogue_staged` (
	`job_id` text NOT NULL,
	`position` integer NOT NULL,
	`id` text NOT NULL,
	`base_version` integer NOT NULL,
	`payload` text NOT NULL,
	`digest` text NOT NULL,
	PRIMARY KEY(`job_id`, `position`),
	FOREIGN KEY (`job_id`) REFERENCES `catalogue_imports`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_catalogue_staged_identity` ON `catalogue_staged` (`job_id`,`id`);