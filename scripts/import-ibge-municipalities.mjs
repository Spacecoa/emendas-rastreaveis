import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import mysql from "mysql2/promise";

const inputPath = process.argv[2];
if (!inputPath) throw new Error("Informe o caminho do arquivo JSONL do IBGE.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não está configurada.");

const records = (await readFile(inputPath, "utf8")).split("\n").filter(Boolean).map(line => JSON.parse(line));
if (!records.length) throw new Error("O arquivo do IBGE não contém registros para importar.");
const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  const populationRecords = records.filter(record => Number.isInteger(record.population));
  const now = new Date();
  let populationSourceId = null;
  if (populationRecords.length) {
    const firstPopulation = populationRecords[0];
    await connection.execute(
      `INSERT INTO data_sources (name, baseUrl, licence, latestSuccessfulLoadAt, latestAttemptAt, status, coverageNote)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE latestSuccessfulLoadAt = VALUES(latestSuccessfulLoadAt), latestAttemptAt = VALUES(latestAttemptAt), status = VALUES(status), coverageNote = VALUES(coverageNote)`,
      [firstPopulation.population_source, firstPopulation.population_source_url, "Dados Abertos IBGE", now, now, "available", `Estimativa municipal com referência em 1º de julho de ${firstPopulation.population_reference_year}; usada apenas quando a emenda estiver vinculada ao código IBGE.`],
    );
    const [sources] = await connection.execute("SELECT id FROM data_sources WHERE name = ? LIMIT 1", [firstPopulation.population_source]);
    populationSourceId = sources[0]?.id ?? null;
  }
  for (const record of records) {
    await connection.execute(
      `INSERT INTO municipalities (ibgeCode, name, uf, population, populationReferenceYear, populationSource, populationSourceUrl, populationExtractedAt, populationRecordHash, source, sourceUrl, extractedAt, recordHash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), uf = VALUES(uf), population = COALESCE(VALUES(population), population), populationReferenceYear = COALESCE(VALUES(populationReferenceYear), populationReferenceYear), populationSource = COALESCE(VALUES(populationSource), populationSource), populationSourceUrl = COALESCE(VALUES(populationSourceUrl), populationSourceUrl), populationExtractedAt = COALESCE(VALUES(populationExtractedAt), populationExtractedAt), populationRecordHash = COALESCE(VALUES(populationRecordHash), populationRecordHash), sourceUrl = VALUES(sourceUrl), extractedAt = VALUES(extractedAt), recordHash = VALUES(recordHash)`,
      [record.ibge_code, record.name, record.uf, record.population ?? null, record.population_reference_year ?? null, record.population_source ?? null, record.population_source_url ?? null, record.population_extracted_at ? new Date(record.population_extracted_at) : null, record.population_record_hash ?? null, record.source, record.source_url, new Date(record.extracted_at), record.record_hash],
    );
  }
  if (populationSourceId) {
    const firstPopulation = populationRecords[0];
    await connection.execute(
      `INSERT INTO ingestion_runs (sourceId, requestedYear, requestedUf, status, recordsExtracted, recordsMatched, matchRate, finishedAt, runHash)
       VALUES (?, ?, ?, 'completed', ?, 0, 0, ?, ?)`,
      [populationSourceId, firstPopulation.population_reference_year, firstPopulation.uf, populationRecords.length, now, createHash("sha256").update(JSON.stringify(populationRecords.map(record => record.population_record_hash))).digest("hex")],
    );
  }
  console.log(JSON.stringify({ ok: true, recordsPersisted: records.length, populationRecords: populationRecords.length }));
} finally {
  await connection.end();
}
