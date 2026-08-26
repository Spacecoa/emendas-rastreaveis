import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import mysql from "mysql2/promise";

const inputPath = process.argv[2];
if (!inputPath) throw new Error("Informe o caminho do catálogo JSONL extraído pelo ETL.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não está configurada.");

const records = (await readFile(inputPath, "utf8")).split("\n").filter(Boolean).map(line => JSON.parse(line));
if (!records.length) throw new Error("O arquivo do catálogo não contém registros para importar.");
const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  const first = records[0];
  const now = new Date();
  await connection.execute(
    `INSERT INTO data_sources (name, baseUrl, licence, latestSuccessfulLoadAt, latestAttemptAt, status, coverageNote)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE latestSuccessfulLoadAt = VALUES(latestSuccessfulLoadAt), latestAttemptAt = VALUES(latestAttemptAt), status = VALUES(status), coverageNote = VALUES(coverageNote)`,
    [first.source, first.source_url, "Dados Abertos Transferegov.br", now, now, "available", "Registros complementares ainda não conciliados com emendas da CGU; taxa de casamento publicada como 0,0000."],
  );
  const [sources] = await connection.execute("SELECT id FROM data_sources WHERE name = ? LIMIT 1", [first.source]);
  const sourceId = sources[0]?.id;
  for (const record of records) {
    await connection.execute(
      `INSERT INTO source_catalog_entries (recordKind, externalKey, cnpj, label, uf, referenceYear, reconciliationStatus, amendmentId, source, sourceUrl, extractedAt, recordHash)
       VALUES (?, ?, ?, ?, ?, ?, 'nao_conciliado', NULL, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE label = VALUES(label), extractedAt = VALUES(extractedAt), sourceUrl = VALUES(sourceUrl)`,
      [record.record_kind, record.external_key ?? null, record.cnpj, record.label, record.uf, record.reference_year, record.source, record.source_url, new Date(record.extracted_at), record.record_hash],
    );
  }
  await connection.execute(
    `INSERT INTO ingestion_runs (sourceId, requestedYear, requestedUf, status, recordsExtracted, recordsMatched, matchRate, finishedAt, runHash)
     VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?)`,
    [sourceId, first.reference_year ?? null, first.uf ?? null, "completed", records.length, now, createHash("sha256").update(JSON.stringify(records.map(record => record.record_hash))).digest("hex")],
  );
  console.log(JSON.stringify({ ok: true, recordsPersisted: records.length, source: first.source }));
} finally {
  await connection.end();
}
