import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const inputPath = process.argv[2];
const year = Number(process.argv[3] ?? 2025);
const RECORD_BATCH_SIZE = 1000;
const LINK_BATCH_SIZE = 1000;
const sourceName = "Transferegov — Emendas";
const sourceUrl =
  "https://repositorio.dados.gov.br/seges/detru/siconv_emenda.csv.zip";

if (!inputPath) {
  throw new Error("Informe o JSONL extraído de emendas do Transferegov.");
}
if (!Number.isInteger(year) || year < 2015 || year > 2100) {
  throw new Error("Informe um exercício válido para a conciliação.");
}
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não está configurada.");
}

function readRecords(content) {
  const records = content
    .split("\n")
    .filter(Boolean)
    .map(line => JSON.parse(line));
  if (!records.length) {
    throw new Error(
      "O arquivo de emendas do Transferegov não contém registros para conciliar."
    );
  }
  for (const record of records) {
    if (!/^\d{8}$/.test(String(record.amendment_number ?? ""))) {
      throw new Error(
        "O JSONL contém NR_EMENDA inválido; a conciliação exige oito dígitos exatos."
      );
    }
    if (!/^\d+$/.test(String(record.proposal_id ?? ""))) {
      throw new Error("O JSONL contém ID_PROPOSTA ausente ou inválido.");
    }
    if (!/^[a-f0-9]{64}$/i.test(String(record.record_hash ?? ""))) {
      throw new Error("O JSONL contém hash de registro inválido.");
    }
    if (Number.isNaN(new Date(record.extracted_at).getTime())) {
      throw new Error("O JSONL contém data de extração inválida.");
    }
  }
  return records;
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function placeholders(rows, columns) {
  return rows
    .map(() => `(${Array.from({ length: columns }, () => "?").join(", ")})`)
    .join(", ");
}

const records = readRecords(await readFile(inputPath, "utf8"));
const now = new Date();
const connection = await mysql.createConnection(process.env.DATABASE_URL);
let runId = null;
let transactionOpen = false;

try {
  await connection.execute(
    `INSERT INTO data_sources (name, baseUrl, licence, latestAttemptAt, status, coverageNote)
     VALUES (?, ?, ?, ?, 'available', ?)
     ON DUPLICATE KEY UPDATE baseUrl = VALUES(baseUrl), licence = VALUES(licence), latestAttemptAt = VALUES(latestAttemptAt), status = VALUES(status), coverageNote = VALUES(coverageNote)`,
    [
      sourceName,
      sourceUrl,
      "Dados Abertos Transferegov.br",
      now,
      "Conciliação documental somente por igualdade exata entre NR_EMENDA e a chave final de oito dígitos do código CGU do mesmo exercício; não comprova entrega física.",
    ]
  );
  const [sources] = await connection.execute(
    "SELECT id FROM data_sources WHERE name = ? LIMIT 1",
    [sourceName]
  );
  const sourceId = sources[0]?.id;
  if (!sourceId) {
    throw new Error(
      "Não foi possível localizar a fonte Transferegov — Emendas."
    );
  }

  const [candidateRows] = await connection.execute(
    "SELECT id, RIGHT(code, 8) AS amendmentKey FROM amendments WHERE year = ? AND RIGHT(code, 8) REGEXP '^[0-9]{8}$'",
    [year]
  );
  if (!candidateRows.length) {
    throw new Error(`Não há chaves CGU de oito dígitos para ${year}.`);
  }
  const candidateIdsByKey = new Map();
  for (const candidate of candidateRows) {
    const key = String(candidate.amendmentKey);
    const ids = candidateIdsByKey.get(key) ?? [];
    ids.push(Number(candidate.id));
    candidateIdsByKey.set(key, ids);
  }
  const candidateAmendmentCount = candidateRows.length;
  const [runResult] = await connection.execute(
    `INSERT INTO ingestion_runs (sourceId, requestedYear, requestedUf, status, recordsExtracted, recordsMatched, finishedAt, runHash)
     VALUES (?, ?, NULL, 'running', 0, 0, NULL, NULL)`,
    [sourceId, year]
  );
  runId = runResult.insertId;

  const matchedAmendments = new Set();
  const proposalMatches = new Map();
  const runHash = createHash("sha256");
  const entries = records.map(record => {
    const candidateIds = candidateIdsByKey.get(record.amendment_number) ?? [];
    const amendmentId = candidateIds.length === 1 ? candidateIds[0] : null;
    if (amendmentId) {
      matchedAmendments.add(amendmentId);
      const proposalIds = proposalMatches.get(record.proposal_id) ?? new Set();
      proposalIds.add(amendmentId);
      proposalMatches.set(record.proposal_id, proposalIds);
    }
    runHash.update(`${record.record_hash}\n`);
    return { record, amendmentId };
  });
  const unambiguousProposalLinks = [...proposalMatches]
    .filter(([, amendmentIds]) => amendmentIds.size === 1)
    .map(([proposalId, amendmentIds]) => ({
      proposalId,
      amendmentId: [...amendmentIds][0],
    }));
  const ambiguousProposalCount =
    proposalMatches.size - unambiguousProposalLinks.length;

  await connection.execute(
    "DROP TEMPORARY TABLE IF EXISTS reconciliation_links"
  );
  await connection.execute(
    "CREATE TEMPORARY TABLE reconciliation_links (proposalId VARCHAR(120) PRIMARY KEY, amendmentId INT NOT NULL)"
  );
  for (const batch of chunks(unambiguousProposalLinks, LINK_BATCH_SIZE)) {
    await connection.execute(
      `INSERT INTO reconciliation_links (proposalId, amendmentId) VALUES ${placeholders(batch, 2)}`,
      batch.flatMap(link => [link.proposalId, link.amendmentId])
    );
  }

  await connection.beginTransaction();
  transactionOpen = true;
  await connection.execute(
    "DELETE FROM source_catalog_entries WHERE recordKind = 'emenda_transferegov' AND referenceYear = ? AND source = ?",
    [year, sourceName]
  );
  await connection.execute(
    `UPDATE source_catalog_entries
     SET reconciliationStatus = 'nao_conciliado', amendmentId = NULL
     WHERE recordKind IN ('objeto', 'instrumento') AND referenceYear = ?`,
    [year]
  );
  let persisted = 0;
  for (const batch of chunks(entries, RECORD_BATCH_SIZE)) {
    await connection.execute(
      `INSERT INTO source_catalog_entries (recordKind, externalKey, cnpj, label, uf, referenceYear, reconciliationStatus, amendmentId, source, sourceUrl, extractedAt, recordHash)
       VALUES ${placeholders(batch, 12)}`,
      batch.flatMap(({ record, amendmentId }) => [
        "emenda_transferegov",
        `emenda:${record.amendment_number}:proposta:${record.proposal_id}:linha:${record.record_hash}`,
        record.beneficiary_cnpj,
        `Emenda ${record.amendment_number}${record.author_name ? ` · ${record.author_name}` : ""}`,
        null,
        year,
        amendmentId ? "conciliado" : "nao_conciliado",
        amendmentId,
        sourceName,
        sourceUrl,
        new Date(record.extracted_at),
        record.record_hash,
      ])
    );
    persisted += batch.length;
    if (persisted % 3000 === 0 || persisted === entries.length) {
      console.error(
        JSON.stringify({ progress: persisted, total: entries.length })
      );
    }
  }
  await connection.execute(
    `UPDATE source_catalog_entries AS catalog
     INNER JOIN reconciliation_links AS links ON links.proposalId = catalog.externalKey
     SET catalog.reconciliationStatus = 'conciliado', catalog.amendmentId = links.amendmentId
     WHERE catalog.recordKind IN ('objeto', 'instrumento') AND catalog.referenceYear = ?`,
    [year]
  );

  const uniqueAmendmentsMatched = matchedAmendments.size;
  const matchRate = uniqueAmendmentsMatched / candidateAmendmentCount;
  const [catalogCoverage] = await connection.execute(
    `SELECT recordKind, COUNT(*) AS total, SUM(reconciliationStatus = 'conciliado') AS linked
     FROM source_catalog_entries
     WHERE recordKind IN ('objeto', 'instrumento') AND referenceYear = ?
     GROUP BY recordKind`,
    [year]
  );
  const catalogEntriesLinked = catalogCoverage.reduce(
    (total, item) => total + Number(item.linked ?? 0),
    0
  );
  await connection.execute(
    "UPDATE data_sources SET latestSuccessfulLoadAt = ?, latestAttemptAt = ?, status = 'available', coverageNote = ? WHERE id = ?",
    [
      now,
      now,
      `${uniqueAmendmentsMatched} de ${candidateAmendmentCount} emendas CGU do exercício correspondem exatamente a NR_EMENDA no Transferegov. ${records.length} linhas de proposta foram preservadas. A conciliação não comprova entrega física.`,
      sourceId,
    ]
  );
  for (const item of catalogCoverage) {
    const sourceForKind =
      item.recordKind === "objeto"
        ? "Transferegov — Propostas"
        : "Transferegov — Convênios";
    await connection.execute(
      "UPDATE data_sources SET coverageNote = ? WHERE name = ?",
      [
        `${Number(item.linked ?? 0)} de ${Number(item.total)} registros do catálogo de ${year} têm proposta ligada por NR_EMENDA confirmado. Os demais permanecem não conciliados; o vínculo documental não comprova entrega física.`,
        sourceForKind,
      ]
    );
  }
  await connection.execute(
    `UPDATE ingestion_runs
     SET status = 'completed', recordsExtracted = ?, recordsMatched = ?, matchRate = ?, finishedAt = ?, runHash = ?
     WHERE id = ?`,
    [
      candidateAmendmentCount,
      uniqueAmendmentsMatched,
      String(matchRate),
      now,
      runHash.digest("hex"),
      runId,
    ]
  );
  await connection.commit();
  transactionOpen = false;
  console.log(
    JSON.stringify({
      ok: true,
      year,
      transferegovRowsRead: records.length,
      candidateAmendments: candidateAmendmentCount,
      uniqueAmendmentsMatched,
      catalogEntriesLinked,
      unambiguousProposalLinks: unambiguousProposalLinks.length,
      ambiguousProposalCount,
      matchRate,
    })
  );
} catch (error) {
  if (transactionOpen) {
    await connection.rollback();
  }
  if (runId) {
    await connection.execute(
      "UPDATE ingestion_runs SET status = 'failed', finishedAt = ?, errorSummary = ? WHERE id = ?",
      [
        new Date(),
        error instanceof Error ? error.message : "Erro desconhecido",
        runId,
      ]
    );
  }
  throw error;
} finally {
  connection.destroy();
}
