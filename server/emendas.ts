import { createHash } from "node:crypto";
import { and, desc, eq, inArray, isNotNull, like, or, sql } from "drizzle-orm";
import { amendments, authors, beneficiaries, dataSources, executionStages, ingestionRuns, municipalities, sourceCatalogEntries } from "../drizzle/schema";
import { getDb } from "./db";
import { fetchPortalAmendments, type OfficialAmendment } from "./portalTransparency";

export async function upsertPortalSource(status: "available" | "failed", now = new Date()) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(dataSources).values({
    name: "Portal da Transparência (CGU)",
    baseUrl: "https://api.portaldatransparencia.gov.br/api-de-dados/emendas",
    status,
    latestAttemptAt: now,
    latestSuccessfulLoadAt: status === "available" ? now : null,
    coverageNote: "Execução financeira oficial; a situação física exige conciliação com Transferegov e outras fontes.",
  }).onDuplicateKeyUpdate({ set: {
    status,
    latestAttemptAt: now,
    ...(status === "available" ? { latestSuccessfulLoadAt: now } : {}),
  } });
  return (await db.select().from(dataSources).where(eq(dataSources.name, "Portal da Transparência (CGU)")).limit(1))[0] ?? null;
}

export async function recordPortalLoad(input: { year: number; status: "completed" | "partial" | "failed"; recordsExtracted: number; recordsMatched: number; errorSummary?: string }) {
  const source = await upsertPortalSource(input.status === "failed" ? "failed" : "available");
  const db = await getDb();
  if (!db || !source) return;
  await db.insert(ingestionRuns).values({
    sourceId: source.id,
    requestedYear: input.year,
    requestedUf: null,
    status: input.status,
    recordsExtracted: input.recordsExtracted,
    recordsMatched: input.recordsMatched,
    matchRate: input.recordsExtracted ? String(input.recordsMatched / input.recordsExtracted) : null,
    errorSummary: input.errorSummary ?? null,
    finishedAt: new Date(),
  });
}

export async function getRecentSourceStatus() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dataSources).orderBy(desc(dataSources.latestAttemptAt));
}

export async function getPublicCoverageSummary() {
  const db = await getDb();
  if (!db) return null;
  const countValue = (value: unknown) => Number(value ?? 0);
  const [amendmentRows, stageRows, beneficiaryRows, objectRows, instrumentRows, stateRows, reconciliationRows, catalogStateRows, sourceRows] = await Promise.all([
    db.select({ total: sql<number>`COUNT(*)` }).from(amendments).where(eq(amendments.year, 2025)),
    db.select({ total: sql<number>`COUNT(*)` }).from(executionStages),
    db.select({ total: sql<number>`COUNT(*)` }).from(beneficiaries),
    db.select({ total: sql<number>`COUNT(*)` }).from(sourceCatalogEntries).where(eq(sourceCatalogEntries.recordKind, "objeto")),
    db.select({ total: sql<number>`COUNT(*)` }).from(sourceCatalogEntries).where(eq(sourceCatalogEntries.recordKind, "instrumento")),
    db.select({
      uf: municipalities.uf,
      municipalityCount: sql<number>`COUNT(*)`,
      population: sql<number | null>`SUM(${municipalities.population})`,
      populationReferenceYear: sql<number | null>`MAX(${municipalities.populationReferenceYear})`,
      populationSourceUrl: sql<string | null>`MAX(${municipalities.populationSourceUrl})`,
      updatedAt: sql<Date | null>`MAX(${municipalities.populationExtractedAt})`,
    }).from(municipalities).where(isNotNull(municipalities.population)).groupBy(municipalities.uf),
    db.select({
      evaluated: ingestionRuns.recordsExtracted,
      matched: ingestionRuns.recordsMatched,
      matchRate: ingestionRuns.matchRate,
      updatedAt: ingestionRuns.finishedAt,
    }).from(ingestionRuns).innerJoin(dataSources, eq(ingestionRuns.sourceId, dataSources.id)).where(eq(dataSources.name, "Transferegov — Emendas")).orderBy(desc(ingestionRuns.id)).limit(1),
    db.select({
      uf: sourceCatalogEntries.uf,
      recordKind: sourceCatalogEntries.recordKind,
      total: sql<number>`COUNT(*)`,
      reconciled: sql<number>`SUM(CASE WHEN ${sourceCatalogEntries.reconciliationStatus} = 'conciliado' THEN 1 ELSE 0 END)`,
      latestUpdate: sql<Date | null>`MAX(${sourceCatalogEntries.extractedAt})`,
      sourceUrl: sql<string | null>`MAX(${sourceCatalogEntries.sourceUrl})`,
      hashes: sql<number>`COUNT(DISTINCT ${sourceCatalogEntries.recordHash})`,
    }).from(sourceCatalogEntries).where(and(
      isNotNull(sourceCatalogEntries.uf),
      inArray(sourceCatalogEntries.recordKind, ["beneficiario", "objeto", "instrumento"]),
    )).groupBy(sourceCatalogEntries.uf, sourceCatalogEntries.recordKind),
    db.select({
      name: dataSources.name,
      baseUrl: dataSources.baseUrl,
      status: dataSources.status,
      latestSuccessfulLoadAt: dataSources.latestSuccessfulLoadAt,
      coverageNote: dataSources.coverageNote,
    }).from(dataSources).orderBy(dataSources.name),
  ]);
  const reconciliation = reconciliationRows[0] ?? null;
  const catalogByState = new Map<string, {
    beneficiaries: number;
    objects: number;
    instruments: number;
    reconciledObjects: number;
    reconciledInstruments: number;
    catalogUpdatedAt: Date | null;
    provenance: Array<{ kind: "beneficiario" | "objeto" | "instrumento"; sourceUrl: string | null; hashes: number }>;
  }>();
  for (const row of catalogStateRows) {
    if (!row.uf) continue;
    if (row.recordKind !== "beneficiario" && row.recordKind !== "objeto" && row.recordKind !== "instrumento") continue;
    const current = catalogByState.get(row.uf) ?? {
      beneficiaries: 0, objects: 0, instruments: 0, reconciledObjects: 0, reconciledInstruments: 0, catalogUpdatedAt: null, provenance: [],
    };
    const total = countValue(row.total);
    const reconciled = countValue(row.reconciled);
    if (row.recordKind === "beneficiario") current.beneficiaries = total;
    if (row.recordKind === "objeto") { current.objects = total; current.reconciledObjects = reconciled; }
    if (row.recordKind === "instrumento") { current.instruments = total; current.reconciledInstruments = reconciled; }
    if (!current.catalogUpdatedAt || (row.latestUpdate && row.latestUpdate > current.catalogUpdatedAt)) current.catalogUpdatedAt = row.latestUpdate;
    current.provenance.push({ kind: row.recordKind, sourceUrl: row.sourceUrl, hashes: countValue(row.hashes) });
    catalogByState.set(row.uf, current);
  }
  return {
    referenceYear: 2025,
    totals: {
      amendments: countValue(amendmentRows[0]?.total),
      financialStages: countValue(stageRows[0]?.total),
      beneficiaries: countValue(beneficiaryRows[0]?.total),
      objects: countValue(objectRows[0]?.total),
      instruments: countValue(instrumentRows[0]?.total),
      municipalities: stateRows.reduce((total, state) => total + countValue(state.municipalityCount), 0),
    },
    availableStates: stateRows.map(state => ({
      uf: state.uf,
      municipalityCount: countValue(state.municipalityCount),
      population: state.population === null ? null : countValue(state.population),
      populationReferenceYear: state.populationReferenceYear === null ? null : countValue(state.populationReferenceYear),
      populationSourceUrl: state.populationSourceUrl,
      updatedAt: state.updatedAt,
      catalog: catalogByState.get(state.uf) ?? {
        beneficiaries: 0, objects: 0, instruments: 0, reconciledObjects: 0, reconciledInstruments: 0, catalogUpdatedAt: null, provenance: [],
      },
    })),
    reconciliation: reconciliation ? {
      evaluated: countValue(reconciliation.evaluated),
      matched: countValue(reconciliation.matched),
      matchRate: reconciliation.matchRate === null ? null : Number(reconciliation.matchRate),
      updatedAt: reconciliation.updatedAt,
    } : null,
    sources: sourceRows.map(source => ({
      name: source.name,
      baseUrl: source.baseUrl,
      status: source.status,
      latestSuccessfulLoadAt: source.latestSuccessfulLoadAt,
      coverageNote: source.coverageNote,
    })),
  };
}

export async function getStoredAmendment(code: string, year: number): Promise<OfficialAmendment | null> {
  const db = await getDb();
  if (!db) return null;
  const row = (await db.select({ amendment: amendments, authorName: authors.name }).from(amendments).leftJoin(authors, eq(amendments.authorId, authors.id)).where(and(eq(amendments.code, code), eq(amendments.year, year))).limit(1))[0];
  if (!row) return null;
  const amendment = row.amendment;
  const stages = await db.select().from(executionStages).where(eq(executionStages.amendmentId, amendment.id));
  const amountAt = (stage: string) => {
    const value = stages.find(item => item.stage === stage)?.amount;
    return value === null || value === undefined ? null : Number(value);
  };
  return {
    code: amendment.code,
    year: amendment.year,
    type: amendment.amendmentType,
    author: row.authorName ?? null,
    number: amendment.amendmentNumber,
    locality: amendment.locality,
    budgetFunction: amendment.budgetFunction,
    budgetSubfunction: amendment.budgetSubfunction,
    committed: amountAt("empenho"),
    settled: amountAt("liquidacao"),
    paid: amountAt("pagamento"),
    remainingRegistered: amountAt("restos_inscritos"),
    remainingCancelled: amountAt("restos_cancelados"),
    remainingPaid: amountAt("restos_pagos"),
    complianceStatus: amendment.complianceStatus,
    source: amendment.source as OfficialAmendment["source"],
    sourceUrl: amendment.sourceUrl,
    extractedAt: amendment.extractedAt.toISOString(),
    recordHash: amendment.recordHash,
  };
}

export async function searchStoredAmendments(input: { query: string; year: number; uf?: string; status?: OfficialAmendment["complianceStatus"]; minPaid?: number; author?: string; budgetFunction?: string; page?: number }): Promise<OfficialAmendment[]> {
  const db = await getDb();
  if (!db) return [];
  const query = input.query.trim();
  const filters = [eq(amendments.year, input.year)];
  if (query) {
    const pattern = `%${query}%`;
    filters.push(or(
      like(amendments.code, pattern),
      like(amendments.amendmentNumber, pattern),
      like(amendments.locality, pattern),
      like(amendments.budgetFunction, pattern),
      like(amendments.budgetSubfunction, pattern),
      like(authors.name, pattern),
    )!);
  }
  if (input.uf) {
    const uf = input.uf.toUpperCase();
    filters.push(sql`(
      EXISTS (
        SELECT 1
        FROM source_catalog_entries AS catalogo
        WHERE catalogo.amendmentId = ${amendments.id}
          AND catalogo.uf = ${uf}
          AND catalogo.reconciliationStatus = 'conciliado'
          AND catalogo.recordKind IN ('objeto', 'instrumento')
      )
      OR EXISTS (
        SELECT 1
        FROM municipalities AS municipio
        WHERE municipio.id = ${amendments.municipalityId}
          AND municipio.uf = ${uf}
      )
    )`);
  }
  if (input.status) filters.push(eq(amendments.complianceStatus, input.status));
  if (input.author) filters.push(like(authors.name, `%${input.author.trim()}%`));
  if (input.budgetFunction) filters.push(like(amendments.budgetFunction, `%${input.budgetFunction.trim()}%`));

  const page = Math.max(1, input.page ?? 1);
  const rows = await db.select({ code: amendments.code }).from(amendments).leftJoin(authors, eq(amendments.authorId, authors.id)).where(and(...filters)).limit(40).offset((page - 1) * 40);
  const records = await Promise.all(rows.map(row => getStoredAmendment(row.code, input.year)));
  return records.filter((record): record is OfficialAmendment => record !== null && (input.minPaid === undefined || (record.paid !== null && record.paid >= input.minPaid)));
}

export async function hasStoredAmendments(year: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ id: amendments.id }).from(amendments).where(eq(amendments.year, year)).limit(1);
  return rows.length > 0;
}

function authorHash(name: string) {
  return createHash("sha256").update(`portal-transparencia:autor:${name.toLocaleUpperCase("pt-BR")}`).digest("hex");
}

async function persistPortalRecord(record: OfficialAmendment) {
  const db = await getDb();
  if (!db || !record.code || record.year === null) return false;
  const extractedAt = new Date(record.extractedAt);
  let authorId: number | null = null;

  if (record.author) {
    const hash = authorHash(record.author);
    await db.insert(authors).values({
      stableCode: null,
      name: record.author,
      authorType: record.author.toLocaleUpperCase("pt-BR").startsWith("BANCADA") ? "bancada" : "parlamentar",
      source: record.source,
      sourceUrl: record.sourceUrl,
      extractedAt,
      recordHash: hash,
    }).onDuplicateKeyUpdate({ set: { sourceUrl: record.sourceUrl, extractedAt } });
    authorId = (await db.select({ id: authors.id }).from(authors).where(eq(authors.recordHash, hash)).limit(1))[0]?.id ?? null;
  }

  await db.insert(amendments).values({
    code: record.code,
    year: record.year,
    amendmentNumber: record.number,
    authorId,
    rp: null,
    amendmentType: record.type ?? "Tipo não informado pela fonte",
    locality: record.locality,
    municipalityId: null,
    budgetFunction: record.budgetFunction,
    budgetSubfunction: record.budgetSubfunction,
    indicationAmount: null,
    authorizedAmount: null,
    complianceStatus: record.complianceStatus,
    source: record.source,
    sourceUrl: record.sourceUrl,
    extractedAt,
    recordHash: record.recordHash,
  }).onDuplicateKeyUpdate({ set: {
    amendmentNumber: record.number,
    authorId,
    amendmentType: record.type ?? "Tipo não informado pela fonte",
    locality: record.locality,
    budgetFunction: record.budgetFunction,
    budgetSubfunction: record.budgetSubfunction,
    complianceStatus: record.complianceStatus,
    sourceUrl: record.sourceUrl,
    extractedAt,
    recordHash: record.recordHash,
  } });

  const amendment = (await db.select({ id: amendments.id }).from(amendments).where(eq(amendments.code, record.code)).limit(1))[0];
  if (!amendment) return false;
  await db.delete(executionStages).where(eq(executionStages.amendmentId, amendment.id));
  const stages = [
    ["empenho", record.committed],
    ["liquidacao", record.settled],
    ["pagamento", record.paid],
    ["restos_inscritos", record.remainingRegistered],
    ["restos_cancelados", record.remainingCancelled],
    ["restos_pagos", record.remainingPaid],
  ] as const;
  const knownStages = stages.filter(([, amount]) => amount !== null).map(([stage, amount]) => ({
    amendmentId: amendment.id,
    stage,
    amount: amount === null ? null : String(amount),
    occurredAt: null,
    documentNumber: null,
    source: record.source,
    sourceUrl: record.sourceUrl,
    extractedAt,
    recordHash: createHash("sha256").update(`${record.recordHash}:${stage}:${amount}`).digest("hex"),
  }));
  if (knownStages.length) await db.insert(executionStages).values(knownStages);
  return true;
}

export async function runInitialPortalLoad(year: number, maxPages = 5) {
  try {
    const pageLimit = Math.min(Math.max(Math.floor(maxPages), 1), 10);
    let recordsExtracted = 0;
    let recordsPersisted = 0;
    let reachedEnd = false;
    for (let page = 1; page <= pageLimit; page += 1) {
      const records = await fetchPortalAmendments({ year, page });
      recordsExtracted += records.length;
      for (const record of records) {
        if (await persistPortalRecord(record)) recordsPersisted += 1;
      }
      if (records.length < 15) {
        reachedEnd = true;
        break;
      }
    }
    const status = reachedEnd ? "completed" : "partial";
    await recordPortalLoad({ year, status, recordsExtracted, recordsMatched: 0 });
    return { recordsExtracted, recordsPersisted, recordsMatched: 0, pagesAttempted: pageLimit, completed: reachedEnd };
  } catch (error) {
    await recordPortalLoad({ year, status: "failed", recordsExtracted: 0, recordsMatched: 0, errorSummary: error instanceof Error ? error.message : "Erro desconhecido" });
    throw error;
  }
}
