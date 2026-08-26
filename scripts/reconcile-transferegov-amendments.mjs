import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const inputPath = process.argv[2];
const year = Number(process.argv[3] ?? 2025);
if (!inputPath) throw new Error("Informe o JSONL extraído de emendas do Transferegov.");
if (!Number.isInteger(year)) throw new Error("Informe um ano inteiro para a conciliação.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não está configurada.");

const records = (await readFile(inputPath, "utf8")).split("\n").filter(Boolean).map(line => JSON.parse(line));
if (!records.length) throw new Error("O arquivo de emendas do Transferegov não contém registros para conciliar.");

const sourceName = "Transferegov — Emendas";
const sourceUrl = "https://repositorio.dados.gov.br/seges/detru/siconv_emenda.csv.zip";
const now = new Date();
const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  await connection.execute(
    `INSERT INTO data_sources (name, baseUrl, licence, latestSuccessfulLoadAt, latestAttemptAt, status, coverageNote)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE latestSuccessfulLoadAt = VALUES(latestSuccessfulLoadAt), latestAttemptAt = VALUES(latestAttemptAt), status = VALUES(status), coverageNote = VALUES(coverageNote)`,
    [sourceName, sourceUrl, "Dados Abertos Transferegov.br", now, now, "available", "Conciliação somente quando NR_EMENDA corresponde exatamente aos oito dígitos finais do código CGU do mesmo exercício; não comprova entrega física."],
  );
  const [sources] = await connection.execute("SELECT id FROM data_sources WHERE name = ? LIMIT 1", [sourceName]);
  const sourceId = sources[0]?.id;
  const [candidateRows] = await connection.execute("SELECT COUNT(*) AS count FROM amendments WHERE year = ?", [year]);
  const candidateAmendmentCount = Number(candidateRows[0]?.count ?? 0);
  let recordsMatched = 0;
  let catalogEntriesLinked = 0;
  const matchedAmendments = new Set();

  for (const record of records) {
    const [candidates] = await connection.execute(
      "SELECT id, code FROM amendments WHERE year = ? AND RIGHT(code, 8) = ?",
      [year, record.amendment_number],
    );
    const amendmentId = candidates.length === 1 ? candidates[0].id : null;
    const reconciliationStatus = amendmentId ? "conciliado" : "nao_conciliado";
    if (amendmentId) {
      recordsMatched += 1;
      matchedAmendments.add(amendmentId);
    }

    await connection.execute(
      `INSERT INTO source_catalog_entries (recordKind, externalKey, cnpj, label, uf, referenceYear, reconciliationStatus, amendmentId, source, sourceUrl, extractedAt, recordHash)
       VALUES ('emenda_transferegov', ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE reconciliationStatus = VALUES(reconciliationStatus), amendmentId = VALUES(amendmentId), label = VALUES(label), extractedAt = VALUES(extractedAt), sourceUrl = VALUES(sourceUrl)`,
      [
        `emenda:${record.amendment_number}:proposta:${record.proposal_id}`,
        record.beneficiary_cnpj,
        `Emenda ${record.amendment_number}${record.author_name ? ` · ${record.author_name}` : ""}`,
        year,
        reconciliationStatus,
        amendmentId,
        sourceName,
        sourceUrl,
        new Date(record.extracted_at),
        record.record_hash,
      ],
    );
    if (amendmentId) {
      const [result] = await connection.execute(
        `UPDATE source_catalog_entries
         SET reconciliationStatus = 'conciliado', amendmentId = ?
         WHERE externalKey = ? AND recordKind IN ('objeto', 'instrumento') AND reconciliationStatus = 'nao_conciliado'`,
        [amendmentId, record.proposal_id],
      );
      catalogEntriesLinked += result.affectedRows ?? 0;
    }
  }

  const uniqueAmendmentsMatched = matchedAmendments.size;
  const matchRate = candidateAmendmentCount ? uniqueAmendmentsMatched / candidateAmendmentCount : 0;
  await connection.execute(
    `INSERT INTO ingestion_runs (sourceId, requestedYear, requestedUf, status, recordsExtracted, recordsMatched, matchRate, finishedAt, runHash)
     VALUES (?, ?, NULL, 'completed', ?, ?, ?, ?, ?)`,
    [sourceId, year, candidateAmendmentCount, uniqueAmendmentsMatched, String(matchRate), now, createHash("sha256").update(JSON.stringify(records.map(record => record.record_hash))).digest("hex")],
  );
  await connection.execute(
    "UPDATE data_sources SET coverageNote = ? WHERE id = ?",
    [`${uniqueAmendmentsMatched} de ${candidateAmendmentCount} emendas CGU do exercício correspondem exatamente a NR_EMENDA no Transferegov. ${records.length} linhas de proposta foram preservadas. A conciliação não comprova entrega física.`, sourceId],
  );
  const [catalogCoverage] = await connection.execute(
    `SELECT recordKind, COUNT(*) AS total, SUM(reconciliationStatus = 'conciliado') AS linked
     FROM source_catalog_entries
     WHERE recordKind IN ('objeto', 'instrumento')
     GROUP BY recordKind`,
  );
  for (const item of catalogCoverage) {
    const sourceForKind = item.recordKind === "objeto" ? "Transferegov — Propostas" : "Transferegov — Convênios";
    await connection.execute(
      "UPDATE data_sources SET coverageNote = ? WHERE name = ?",
      [`${Number(item.linked ?? 0)} de ${Number(item.total)} registros do catálogo têm proposta ligada por NR_EMENDA confirmado. Os demais permanecem não conciliados; o vínculo documental não comprova entrega física.`, sourceForKind],
    );
  }
  console.log(JSON.stringify({ ok: true, transferegovRowsRead: records.length, candidateAmendments: candidateAmendmentCount, uniqueAmendmentsMatched, catalogEntriesLinked, matchRate }));
} finally {
  await connection.end();
}
