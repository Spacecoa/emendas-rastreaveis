CREATE TABLE `source_catalog_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recordKind` enum('beneficiario','objeto','instrumento') NOT NULL,
	`externalKey` varchar(120),
	`cnpj` varchar(14),
	`label` text NOT NULL,
	`uf` varchar(2),
	`referenceYear` int,
	`reconciliationStatus` enum('nao_conciliado','conciliado') NOT NULL DEFAULT 'nao_conciliado',
	`amendmentId` int,
	`source` varchar(160) NOT NULL,
	`sourceUrl` text NOT NULL,
	`extractedAt` timestamp NOT NULL,
	`recordHash` varchar(64) NOT NULL,
	CONSTRAINT `source_catalog_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `source_catalog_hash_unique` UNIQUE(`recordHash`)
);
--> statement-breakpoint
CREATE INDEX `source_catalog_kind_label_idx` ON `source_catalog_entries` (`recordKind`,`uf`);--> statement-breakpoint
CREATE INDEX `source_catalog_cnpj_idx` ON `source_catalog_entries` (`cnpj`);