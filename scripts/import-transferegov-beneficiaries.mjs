import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const inputPath = process.argv[2];
if (!inputPath) throw new Error("Informe o caminho do arquivo JSONL extraído pelo ETL.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não está configurada.");

const records = (await readFile(inputPath, "utf8")).split("\n").filter(Boolean).map(line => JSON.parse(line));
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const sourceName = "Transferegov — Proponentes";
const sourceUrl = "https://repositorio.dados.gov.br/seges/detru/siconv_proponentes.csv.zip";
const now = new Date();

try {
  await connection.execute(
    `INSERT INTO data_sources (name, baseUrl, licence, latestSuccessfulLoadAt, latestAttemptAt, status, coverageNote)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE latestSuccessfulLoadAt = VALUES(latestSuccessfulLoadAt), latestAttemptAt = VALUES(latestAttemptAt), status = VALUES(status), coverageNote = VALUES(coverageNote)`,
    [sourceName, sourceUrl, "Dados Abertos Transferegov.br", now, now, "available", "Carga limitada por UF de proponentes públicos; ainda não concilia instrumentos e objetos com emendas da CGU."],
  );
  const [sources] = await connection.execute("SELECT id FROM data_sources WHERE name = ? LIMIT 1", [sourceName]);
  const sourceId = sources[0]?.id;
  let persisted = 0;
  for (const record of records) {
    await connection.execute(
      `INSERT INTO beneficiaries (cnpj, name, beneficiaryType, municipalityId, source, sourceUrl, extractedAt, recordHash)
       VALUES (?, ?, ?, NULL, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE cnpj = VALUES(cnpj), name = VALUES(name), extractedAt = VALUES(extractedAt), sourceUrl = VALUES(sourceUrl)`,
      [record.cnpj, record.name, record.beneficiary_type, record.source, record.source_url, new Date(record.extracted_at), record.record_hash],
    );
    await connection.execute(
      `INSERT INTO source_catalog_entries (recordKind, externalKey, cnpj, label, uf, referenceYear, reconciliationStatus, amendmentId, source, sourceUrl, extractedAt, recordHash)
       VALUES ('beneficiario', NULL, ?, ?, ?, NULL, 'nao_conciliado', NULL, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE cnpj = VALUES(cnpj), label = VALUES(label), extractedAt = VALUES(extractedAt), sourceUrl = VALUES(sourceUrl)`,
      [record.cnpj, record.name, record.uf, record.source, record.source_url, new Date(record.extracted_at), record.record_hash],
    );
    persisted += 1;
  }
  await connection.execute(
    `INSERT INTO ingestion_runs (sourceId, requestedYear, requestedUf, status, recordsExtracted, recordsMatched, matchRate, finishedAt, runHash)
     VALUES (?, NULL, ?, ?, ?, 0, NULL, ?, ?)`,
    [sourceId, records[0]?.uf ?? null, "completed", records.length, now, createHash("sha256").update(JSON.stringify(records.map(record => record.record_hash))).digest("hex")],
  );
  console.log(JSON.stringify({ ok: true, recordsExtracted: records.length, recordsPersisted: persisted }));
} finally {
  await connection.end();
}
