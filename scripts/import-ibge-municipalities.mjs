import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const inputPath = process.argv[2];
if (!inputPath) throw new Error("Informe o caminho do arquivo JSONL do IBGE.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não está configurada.");

const records = (await readFile(inputPath, "utf8")).split("\n").filter(Boolean).map(line => JSON.parse(line));
const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  for (const record of records) {
    await connection.execute(
      `INSERT INTO municipalities (ibgeCode, name, uf, population, source, sourceUrl, extractedAt, recordHash)
       VALUES (?, ?, ?, NULL, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), uf = VALUES(uf), sourceUrl = VALUES(sourceUrl), extractedAt = VALUES(extractedAt), recordHash = VALUES(recordHash)`,
      [record.ibge_code, record.name, record.uf, record.source, record.source_url, new Date(record.extracted_at), record.record_hash],
    );
  }
  console.log(JSON.stringify({ ok: true, recordsPersisted: records.length }));
} finally {
  await connection.end();
}
