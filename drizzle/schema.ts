import {
  boolean,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const dataSources = mysqlTable(
  "data_sources",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    baseUrl: text("baseUrl").notNull(),
    licence: varchar("licence", { length: 200 }),
    latestSuccessfulLoadAt: timestamp("latestSuccessfulLoadAt"),
    latestAttemptAt: timestamp("latestAttemptAt"),
    status: mysqlEnum("status", ["available", "delayed", "failed", "not_configured"]).default("not_configured").notNull(),
    coverageNote: text("coverageNote"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("data_sources_name_unique").on(table.name)]
);

export const ingestionRuns = mysqlTable(
  "ingestion_runs",
  {
    id: int("id").autoincrement().primaryKey(),
    sourceId: int("sourceId").notNull(),
    requestedYear: int("requestedYear"),
    requestedUf: varchar("requestedUf", { length: 2 }),
    startedAt: timestamp("startedAt").defaultNow().notNull(),
    finishedAt: timestamp("finishedAt"),
    status: mysqlEnum("status", ["running", "completed", "partial", "failed"]).notNull(),
    recordsExtracted: int("recordsExtracted").default(0).notNull(),
    recordsMatched: int("recordsMatched").default(0).notNull(),
    matchRate: decimal("matchRate", { precision: 7, scale: 4 }),
    errorSummary: text("errorSummary"),
    runHash: varchar("runHash", { length: 64 }),
  },
  table => [index("ingestion_runs_source_started_idx").on(table.sourceId, table.startedAt)]
);

export const authors = mysqlTable(
  "authors",
  {
    id: int("id").autoincrement().primaryKey(),
    stableCode: varchar("stableCode", { length: 80 }),
    name: varchar("name", { length: 255 }).notNull(),
    authorType: mysqlEnum("authorType", ["parlamentar", "bancada", "comissao", "relator"]).notNull(),
    party: varchar("party", { length: 32 }),
    uf: varchar("uf", { length: 2 }),
    legislature: varchar("legislature", { length: 20 }),
    officialPhotoUrl: text("officialPhotoUrl"),
    source: varchar("source", { length: 160 }).notNull(),
    sourceUrl: text("sourceUrl").notNull(),
    extractedAt: timestamp("extractedAt").notNull(),
    recordHash: varchar("recordHash", { length: 64 }).notNull(),
  },
  table => [index("authors_name_idx").on(table.name), uniqueIndex("authors_hash_unique").on(table.recordHash)]
);

export const municipalities = mysqlTable(
  "municipalities",
  {
    id: int("id").autoincrement().primaryKey(),
    ibgeCode: varchar("ibgeCode", { length: 7 }).notNull(),
    name: varchar("name", { length: 180 }).notNull(),
    uf: varchar("uf", { length: 2 }).notNull(),
    population: int("population"),
    source: varchar("source", { length: 160 }).notNull(),
    sourceUrl: text("sourceUrl").notNull(),
    extractedAt: timestamp("extractedAt").notNull(),
    recordHash: varchar("recordHash", { length: 64 }).notNull(),
  },
  table => [uniqueIndex("municipalities_ibge_unique").on(table.ibgeCode), index("municipalities_name_uf_idx").on(table.name, table.uf)]
);

export const beneficiaries = mysqlTable(
  "beneficiaries",
  {
    id: int("id").autoincrement().primaryKey(),
    cnpj: varchar("cnpj", { length: 14 }),
    name: varchar("name", { length: 255 }).notNull(),
    beneficiaryType: mysqlEnum("beneficiaryType", ["municipio", "estado", "uniao", "entidade_privada", "outro"]).notNull(),
    municipalityId: int("municipalityId"),
    source: varchar("source", { length: 160 }).notNull(),
    sourceUrl: text("sourceUrl").notNull(),
    extractedAt: timestamp("extractedAt").notNull(),
    recordHash: varchar("recordHash", { length: 64 }).notNull(),
  },
  table => [index("beneficiaries_cnpj_idx").on(table.cnpj), index("beneficiaries_name_idx").on(table.name)]
);

export const amendments = mysqlTable(
  "amendments",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 32 }).notNull(),
    year: int("year").notNull(),
    amendmentNumber: varchar("amendmentNumber", { length: 32 }),
    authorId: int("authorId"),
    rp: varchar("rp", { length: 8 }),
    amendmentType: varchar("amendmentType", { length: 255 }).notNull(),
    locality: varchar("locality", { length: 255 }),
    municipalityId: int("municipalityId"),
    budgetFunction: varchar("budgetFunction", { length: 180 }),
    budgetSubfunction: varchar("budgetSubfunction", { length: 180 }),
    indicationAmount: decimal("indicationAmount", { precision: 18, scale: 2 }),
    authorizedAmount: decimal("authorizedAmount", { precision: 18, scale: 2 }),
    complianceStatus: mysqlEnum("complianceStatus", ["executada_comprovada", "em_execucao", "pendencia", "nao_cumprida", "informacao_insuficiente"]).default("informacao_insuficiente").notNull(),
    source: varchar("source", { length: 160 }).notNull(),
    sourceUrl: text("sourceUrl").notNull(),
    extractedAt: timestamp("extractedAt").notNull(),
    recordHash: varchar("recordHash", { length: 64 }).notNull(),
  },
  table => [uniqueIndex("amendments_code_year_unique").on(table.code, table.year), index("amendments_author_year_idx").on(table.authorId, table.year), index("amendments_municipality_year_idx").on(table.municipalityId, table.year)]
);

export const budgetPrograms = mysqlTable("budget_programs", {
  id: int("id").autoincrement().primaryKey(),
  amendmentId: int("amendmentId").notNull(),
  agencyCode: varchar("agencyCode", { length: 32 }),
  actionCode: varchar("actionCode", { length: 32 }),
  actionName: text("actionName"),
  authorizedAmount: decimal("authorizedAmount", { precision: 18, scale: 2 }),
  source: varchar("source", { length: 160 }).notNull(),
  sourceUrl: text("sourceUrl").notNull(),
  extractedAt: timestamp("extractedAt").notNull(),
  recordHash: varchar("recordHash", { length: 64 }).notNull(),
});

export const executionStages = mysqlTable(
  "execution_stages",
  {
    id: int("id").autoincrement().primaryKey(),
    amendmentId: int("amendmentId").notNull(),
    stage: mysqlEnum("stage", ["indicacao", "dotacao", "empenho", "liquidacao", "pagamento", "restos_inscritos", "restos_pagos", "restos_cancelados"]).notNull(),
    amount: decimal("amount", { precision: 18, scale: 2 }),
    occurredAt: timestamp("occurredAt"),
    documentNumber: varchar("documentNumber", { length: 80 }),
    source: varchar("source", { length: 160 }).notNull(),
    sourceUrl: text("sourceUrl").notNull(),
    extractedAt: timestamp("extractedAt").notNull(),
    recordHash: varchar("recordHash", { length: 64 }).notNull(),
  },
  table => [index("execution_stages_amendment_stage_idx").on(table.amendmentId, table.stage)]
);

export const instruments = mysqlTable("instruments", {
  id: int("id").autoincrement().primaryKey(),
  amendmentId: int("amendmentId").notNull(),
  beneficiaryId: int("beneficiaryId"),
  instrumentType: mysqlEnum("instrumentType", ["convenio", "contrato_repasse", "fundo_a_fundo", "transferencia_especial", "outro"]).notNull(),
  instrumentNumber: varchar("instrumentNumber", { length: 80 }),
  status: varchar("status", { length: 120 }),
  validUntil: timestamp("validUntil"),
  source: varchar("source", { length: 160 }).notNull(),
  sourceUrl: text("sourceUrl").notNull(),
  extractedAt: timestamp("extractedAt").notNull(),
  recordHash: varchar("recordHash", { length: 64 }).notNull(),
});

export const amendmentObjects = mysqlTable("amendment_objects", {
  id: int("id").autoincrement().primaryKey(),
  amendmentId: int("amendmentId").notNull(),
  plainDescription: text("plainDescription"),
  officialDescription: text("officialDescription"),
  source: varchar("source", { length: 160 }).notNull(),
  sourceUrl: text("sourceUrl").notNull(),
  extractedAt: timestamp("extractedAt").notNull(),
  recordHash: varchar("recordHash", { length: 64 }).notNull(),
});

export const physicalMilestones = mysqlTable("physical_milestones", {
  id: int("id").autoincrement().primaryKey(),
  instrumentId: int("instrumentId").notNull(),
  status: varchar("status", { length: 160 }),
  progressPercent: decimal("progressPercent", { precision: 5, scale: 2 }),
  occurredAt: timestamp("occurredAt"),
  evidenceUrl: text("evidenceUrl"),
  source: varchar("source", { length: 160 }).notNull(),
  sourceUrl: text("sourceUrl").notNull(),
  extractedAt: timestamp("extractedAt").notNull(),
  recordHash: varchar("recordHash", { length: 64 }).notNull(),
});

export const accountabilities = mysqlTable("accountabilities", {
  id: int("id").autoincrement().primaryKey(),
  instrumentId: int("instrumentId").notNull(),
  status: mysqlEnum("status", ["pendente", "em_analise", "aprovada", "rejeitada", "nao_disponivel"]).default("nao_disponivel").notNull(),
  dueAt: timestamp("dueAt"),
  decidedAt: timestamp("decidedAt"),
  source: varchar("source", { length: 160 }).notNull(),
  sourceUrl: text("sourceUrl").notNull(),
  extractedAt: timestamp("extractedAt").notNull(),
  recordHash: varchar("recordHash", { length: 64 }).notNull(),
});

export const complianceAlerts = mysqlTable("compliance_alerts", {
  id: int("id").autoincrement().primaryKey(),
  amendmentId: int("amendmentId").notNull(),
  kind: mysqlEnum("kind", ["novo_empenho", "novo_pagamento", "mudanca_status", "vigencia_vencida", "prestacao_pendente"]).notNull(),
  message: text("message").notNull(),
  source: varchar("source", { length: 160 }).notNull(),
  sourceUrl: text("sourceUrl").notNull(),
  extractedAt: timestamp("extractedAt").notNull(),
  recordHash: varchar("recordHash", { length: 64 }).notNull(),
});

export const alertSubscriptions = mysqlTable(
  "alert_subscriptions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    municipalityId: int("municipalityId"),
    authorId: int("authorId"),
    email: varchar("email", { length: 320 }).notNull(),
    active: boolean("active").default(true).notNull(),
    scheduleCronTaskUid: varchar("schedule_cron_task_uid", { length: 65 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("alert_subscriptions_cron_uid_idx").on(table.scheduleCronTaskUid), index("alert_subscriptions_user_idx").on(table.userId)]
);

export const publicApiKeys = mysqlTable("public_api_keys", {
  id: int("id").autoincrement().primaryKey(),
  label: varchar("label", { length: 100 }).notNull(),
  scope: json("scope"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const sourceRefreshConfigs = mysqlTable(
  "source_refresh_configs",
  {
    id: int("id").autoincrement().primaryKey(),
    sourceId: int("sourceId").notNull(),
    targetYear: int("targetYear").notNull(),
    targetUf: varchar("targetUf", { length: 2 }),
    enabled: boolean("enabled").default(true).notNull(),
    scheduleCronTaskUid: varchar("schedule_cron_task_uid", { length: 65 }),
    lastRunAt: timestamp("lastRunAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("source_refresh_configs_cron_uid_unique").on(table.scheduleCronTaskUid), index("source_refresh_configs_source_idx").on(table.sourceId)]
);
