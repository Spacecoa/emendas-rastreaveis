CREATE TABLE `accountabilities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`instrumentId` int NOT NULL,
	`status` enum('pendente','em_analise','aprovada','rejeitada','nao_disponivel') NOT NULL DEFAULT 'nao_disponivel',
	`dueAt` timestamp,
	`decidedAt` timestamp,
	`source` varchar(160) NOT NULL,
	`sourceUrl` text NOT NULL,
	`extractedAt` timestamp NOT NULL,
	`recordHash` varchar(64) NOT NULL,
	CONSTRAINT `accountabilities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `alert_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`municipalityId` int,
	`authorId` int,
	`email` varchar(320) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`schedule_cron_task_uid` varchar(65),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alert_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `amendment_objects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`amendmentId` int NOT NULL,
	`plainDescription` text,
	`officialDescription` text,
	`source` varchar(160) NOT NULL,
	`sourceUrl` text NOT NULL,
	`extractedAt` timestamp NOT NULL,
	`recordHash` varchar(64) NOT NULL,
	CONSTRAINT `amendment_objects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `amendments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`year` int NOT NULL,
	`amendmentNumber` varchar(32),
	`authorId` int,
	`rp` varchar(8),
	`amendmentType` varchar(255) NOT NULL,
	`locality` varchar(255),
	`municipalityId` int,
	`budgetFunction` varchar(180),
	`budgetSubfunction` varchar(180),
	`indicationAmount` decimal(18,2),
	`authorizedAmount` decimal(18,2),
	`complianceStatus` enum('executada_comprovada','em_execucao','pendencia','nao_cumprida','informacao_insuficiente') NOT NULL DEFAULT 'informacao_insuficiente',
	`source` varchar(160) NOT NULL,
	`sourceUrl` text NOT NULL,
	`extractedAt` timestamp NOT NULL,
	`recordHash` varchar(64) NOT NULL,
	CONSTRAINT `amendments_id` PRIMARY KEY(`id`),
	CONSTRAINT `amendments_code_year_unique` UNIQUE(`code`,`year`)
);
--> statement-breakpoint
CREATE TABLE `authors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stableCode` varchar(80),
	`name` varchar(255) NOT NULL,
	`authorType` enum('parlamentar','bancada','comissao','relator') NOT NULL,
	`party` varchar(32),
	`uf` varchar(2),
	`legislature` varchar(20),
	`officialPhotoUrl` text,
	`source` varchar(160) NOT NULL,
	`sourceUrl` text NOT NULL,
	`extractedAt` timestamp NOT NULL,
	`recordHash` varchar(64) NOT NULL,
	CONSTRAINT `authors_id` PRIMARY KEY(`id`),
	CONSTRAINT `authors_hash_unique` UNIQUE(`recordHash`)
);
--> statement-breakpoint
CREATE TABLE `beneficiaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cnpj` varchar(14),
	`name` varchar(255) NOT NULL,
	`beneficiaryType` enum('municipio','estado','uniao','entidade_privada','outro') NOT NULL,
	`municipalityId` int,
	`source` varchar(160) NOT NULL,
	`sourceUrl` text NOT NULL,
	`extractedAt` timestamp NOT NULL,
	`recordHash` varchar(64) NOT NULL,
	CONSTRAINT `beneficiaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budget_programs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`amendmentId` int NOT NULL,
	`agencyCode` varchar(32),
	`actionCode` varchar(32),
	`actionName` text,
	`authorizedAmount` decimal(18,2),
	`source` varchar(160) NOT NULL,
	`sourceUrl` text NOT NULL,
	`extractedAt` timestamp NOT NULL,
	`recordHash` varchar(64) NOT NULL,
	CONSTRAINT `budget_programs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `compliance_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`amendmentId` int NOT NULL,
	`kind` enum('novo_empenho','novo_pagamento','mudanca_status','vigencia_vencida','prestacao_pendente') NOT NULL,
	`message` text NOT NULL,
	`source` varchar(160) NOT NULL,
	`sourceUrl` text NOT NULL,
	`extractedAt` timestamp NOT NULL,
	`recordHash` varchar(64) NOT NULL,
	CONSTRAINT `compliance_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `data_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`baseUrl` text NOT NULL,
	`licence` varchar(200),
	`latestSuccessfulLoadAt` timestamp,
	`latestAttemptAt` timestamp,
	`status` enum('available','delayed','failed','not_configured') NOT NULL DEFAULT 'not_configured',
	`coverageNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `data_sources_id` PRIMARY KEY(`id`),
	CONSTRAINT `data_sources_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `execution_stages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`amendmentId` int NOT NULL,
	`stage` enum('indicacao','dotacao','empenho','liquidacao','pagamento','restos_inscritos','restos_pagos','restos_cancelados') NOT NULL,
	`amount` decimal(18,2),
	`occurredAt` timestamp,
	`documentNumber` varchar(80),
	`source` varchar(160) NOT NULL,
	`sourceUrl` text NOT NULL,
	`extractedAt` timestamp NOT NULL,
	`recordHash` varchar(64) NOT NULL,
	CONSTRAINT `execution_stages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ingestion_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceId` int NOT NULL,
	`requestedYear` int,
	`requestedUf` varchar(2),
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`finishedAt` timestamp,
	`status` enum('running','completed','partial','failed') NOT NULL,
	`recordsExtracted` int NOT NULL DEFAULT 0,
	`recordsMatched` int NOT NULL DEFAULT 0,
	`matchRate` decimal(7,4),
	`errorSummary` text,
	`runHash` varchar(64),
	CONSTRAINT `ingestion_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `instruments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`amendmentId` int NOT NULL,
	`beneficiaryId` int,
	`instrumentType` enum('convenio','contrato_repasse','fundo_a_fundo','transferencia_especial','outro') NOT NULL,
	`instrumentNumber` varchar(80),
	`status` varchar(120),
	`validUntil` timestamp,
	`source` varchar(160) NOT NULL,
	`sourceUrl` text NOT NULL,
	`extractedAt` timestamp NOT NULL,
	`recordHash` varchar(64) NOT NULL,
	CONSTRAINT `instruments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `municipalities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ibgeCode` varchar(7) NOT NULL,
	`name` varchar(180) NOT NULL,
	`uf` varchar(2) NOT NULL,
	`population` int,
	`source` varchar(160) NOT NULL,
	`sourceUrl` text NOT NULL,
	`extractedAt` timestamp NOT NULL,
	`recordHash` varchar(64) NOT NULL,
	CONSTRAINT `municipalities_id` PRIMARY KEY(`id`),
	CONSTRAINT `municipalities_ibge_unique` UNIQUE(`ibgeCode`)
);
--> statement-breakpoint
CREATE TABLE `physical_milestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`instrumentId` int NOT NULL,
	`status` varchar(160),
	`progressPercent` decimal(5,2),
	`occurredAt` timestamp,
	`evidenceUrl` text,
	`source` varchar(160) NOT NULL,
	`sourceUrl` text NOT NULL,
	`extractedAt` timestamp NOT NULL,
	`recordHash` varchar(64) NOT NULL,
	CONSTRAINT `physical_milestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `public_api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`label` varchar(100) NOT NULL,
	`scope` json,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `public_api_keys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `alert_subscriptions_cron_uid_idx` ON `alert_subscriptions` (`schedule_cron_task_uid`);--> statement-breakpoint
CREATE INDEX `alert_subscriptions_user_idx` ON `alert_subscriptions` (`userId`);--> statement-breakpoint
CREATE INDEX `amendments_author_year_idx` ON `amendments` (`authorId`,`year`);--> statement-breakpoint
CREATE INDEX `amendments_municipality_year_idx` ON `amendments` (`municipalityId`,`year`);--> statement-breakpoint
CREATE INDEX `authors_name_idx` ON `authors` (`name`);--> statement-breakpoint
CREATE INDEX `beneficiaries_cnpj_idx` ON `beneficiaries` (`cnpj`);--> statement-breakpoint
CREATE INDEX `beneficiaries_name_idx` ON `beneficiaries` (`name`);--> statement-breakpoint
CREATE INDEX `execution_stages_amendment_stage_idx` ON `execution_stages` (`amendmentId`,`stage`);--> statement-breakpoint
CREATE INDEX `ingestion_runs_source_started_idx` ON `ingestion_runs` (`sourceId`,`startedAt`);--> statement-breakpoint
CREATE INDEX `municipalities_name_uf_idx` ON `municipalities` (`name`,`uf`);