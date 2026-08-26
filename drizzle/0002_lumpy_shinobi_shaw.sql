CREATE TABLE `source_refresh_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceId` int NOT NULL,
	`targetYear` int NOT NULL,
	`targetUf` varchar(2),
	`enabled` boolean NOT NULL DEFAULT true,
	`schedule_cron_task_uid` varchar(65),
	`lastRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `source_refresh_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `source_refresh_configs_cron_uid_unique` UNIQUE(`schedule_cron_task_uid`)
);
--> statement-breakpoint
CREATE INDEX `source_refresh_configs_source_idx` ON `source_refresh_configs` (`sourceId`);