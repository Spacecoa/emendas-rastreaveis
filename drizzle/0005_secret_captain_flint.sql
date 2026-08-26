ALTER TABLE `municipalities` ADD `populationReferenceYear` int;--> statement-breakpoint
ALTER TABLE `municipalities` ADD `populationSource` varchar(160);--> statement-breakpoint
ALTER TABLE `municipalities` ADD `populationSourceUrl` text;--> statement-breakpoint
ALTER TABLE `municipalities` ADD `populationExtractedAt` timestamp;--> statement-breakpoint
ALTER TABLE `municipalities` ADD `populationRecordHash` varchar(64);