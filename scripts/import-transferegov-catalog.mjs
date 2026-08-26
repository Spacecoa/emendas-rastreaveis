import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const inputPath = process.argv[2];
if (!inputPath) throw new Error("Informe o caminho do catálogo JSONL extraído pelo ETL.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não está configurada.");

const records = (await readFile(inputPath, "utf8")).split("\n").filter(Boolean).map(line => JSON.parse(line));
const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  for (const record of records) {
    await connection.execute(
      `INSERT INTO source_catalog_entries (recordKind, externalKey, cnpj, label, uf, referenceYear, reconciliationStatus, amendmentId, source, sourceUrl, extractedAt, recordHash)
       VALUES (?, ?, ?, ?, ?, ?, 'nao_conciliado', NULL, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE label = VALUES(label), extractedAt = VALUES(extractedAt), sourceUrl = VALUES(sourceUrl)`,
      [record.record_kind, record.external_key ?? null, record.cnpj, record.label, record.uf, record.reference_year, record.source, record.source_url, new Date(record.extracted_at), record.record_hash],
    );
  }
  console.log(JSON.stringify({ ok: true, recordsPersisted: records.length }));
} finally {
  await connection.end();
}
