import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import mysql from "mysql2/promise";
import {
  CGU_NATIONAL_FILE_URL,
  createCguHeaderIndex,
  parseSemicolonCsvLine,
  toCguNationalAmendment,
} from "../server/cguNationalCsv.ts";

const zipPath = process.argv[2];
const year = Number(process.argv[3] ?? 2025);
if (!zipPath) throw new Error("Informe o caminho do ZIP oficial de emendas.");
if (!Number.isInteger(year) || year < 2015 || year > 2100) {
  throw new Error("Informe um exercício válido.");
}
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não está configurada.");
}

const source = {
  name: "Portal da Transparência (CGU)",
  url: CGU_NATIONAL_FILE_URL,
  licence: "Dados Abertos do Governo Federal",
  note: "Arquivo único oficial de emendas financeiras. A carga nacional não usa filtro UF; vínculos territoriais exigem código municipal IBGE ou conciliação documental.",
};

function authorHash(name) {
  return createHash("sha256")
    .update(`portal-transparencia:autor:${name.toLocaleUpperCase("pt-BR")}`)
    .digest("hex");
}

function asDecimal(value) {
  return value === null ? null : String(value);
}

function readOfficialCsv(zip) {
  const unzip = spawn("unzip", ["-p", zip, "EmendasParlamentares.csv"]);
  const iconv = spawn("iconv", ["-f", "WINDOWS-1252", "-t", "UTF-8"]);
  unzip.stdout.pipe(iconv.stdin);
  const lines = createInterface({ input: iconv.stdout, crlfDelay: Infinity });
  const completion = Promise.all([
    new Promise((resolve, reject) => {
      unzip.on("error", reject);
      unzip.on("close", code =>
        code === 0 ? resolve(undefined) : reject(new Error(`unzip encerrou com código ${code}.`))
      );
    }),
    new Promise((resolve, reject) => {
      iconv.on("error", reject);
      iconv.on("close", code =>
        code === 0 ? resolve(undefined) : reject(new Error(`iconv encerrou com código ${code}.`))
      );
    }),
  ]);
  return { lines, completion };
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);
let runId = null;
try {
  const now = new Date();
  const extractedAt = now.toISOString();
  await connection.execute(
    `INSERT INTO data_sources (name, baseUrl, licence, latestSuccessfulLoadAt, latestAttemptAt, status, coverageNote)
     VALUES (?, ?, ?, ?, ?, 'available', ?)
     ON DUPLICATE KEY UPDATE baseUrl = VALUES(baseUrl), licence = VALUES(licence), latestAttemptAt = VALUES(latestAttemptAt), status = VALUES(status), coverageNote = VALUES(coverageNote)`,
    [source.name, source.url, source.licence, now, now, source.note]
  );
  const [sourceRows] = await connection.execute(
    "SELECT id FROM data_sources WHERE name = ? LIMIT 1",
    [source.name]
  );
  const sourceId = sourceRows[0]?.id;
  if (!sourceId) throw new Error("Não foi possível localizar a fonte CGU.");

  const [municipalityRows] = await connection.execute(
    "SELECT id, ibgeCode FROM municipalities"
  );
  const municipalityIds = new Map(
    municipalityRows.map(row => [String(row.ibgeCode), Number(row.id)])
  );
  const [runResult] = await connection.execute(
    `INSERT INTO ingestion_runs (sourceId, requestedYear, requestedUf, status, recordsExtracted, recordsMatched, finishedAt, runHash)
     VALUES (?, ?, NULL, 'running', 0, 0, NULL, NULL)`,
    [sourceId, year]
  );
  runId = runResult.insertId;

  await connection.beginTransaction();
  const authors = new Map();
  const runHash = createHash("sha256");
  let recordsExtracted = 0;
  let recordsPersisted = 0;
  let municipalityLinked = 0;
  let headers = null;
  let headerIndex = null;
  const { lines, completion } = readOfficialCsv(zipPath);

  for await (const line of lines) {
    if (!headers) {
      headers = parseSemicolonCsvLine(line);
      headerIndex = createCguHeaderIndex(headers);
      continue;
    }
    const record = toCguNationalAmendment(
      headerIndex,
      parseSemicolonCsvLine(line),
      source.url,
      extractedAt
    );
    if (!record || record.year !== year) continue;
    recordsExtracted += 1;
    runHash.update(`${record.recordHash}\n`);

    let authorId = null;
    if (record.author) {
      const key = authorHash(record.author);
      authorId = authors.get(key) ?? null;
      if (!authorId) {
        await connection.execute(
          `INSERT INTO authors (stableCode, name, authorType, source, sourceUrl, extractedAt, recordHash)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE stableCode = VALUES(stableCode), name = VALUES(name), extractedAt = VALUES(extractedAt), sourceUrl = VALUES(sourceUrl)`,
          [record.authorCode, record.author, record.author.toLocaleUpperCase("pt-BR").startsWith("BANCADA") ? "bancada" : "parlamentar", record.source, record.sourceUrl, now, key]
        );
        const [authorRows] = await connection.execute(
          "SELECT id FROM authors WHERE recordHash = ? LIMIT 1",
          [key]
        );
        authorId = authorRows[0]?.id ?? null;
        authors.set(key, authorId);
      }
    }

    const municipalityId = record.municipalityIbgeCode
      ? municipalityIds.get(record.municipalityIbgeCode) ?? null
      : null;
    if (municipalityId) municipalityLinked += 1;
    await connection.execute(
      `INSERT INTO amendments (code, year, amendmentNumber, authorId, rp, amendmentType, locality, municipalityId, budgetFunction, budgetSubfunction, indicationAmount, authorizedAmount, complianceStatus, source, sourceUrl, extractedAt, recordHash)
       VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE amendmentNumber = VALUES(amendmentNumber), authorId = VALUES(authorId), amendmentType = VALUES(amendmentType), locality = VALUES(locality), municipalityId = VALUES(municipalityId), budgetFunction = VALUES(budgetFunction), budgetSubfunction = VALUES(budgetSubfunction), complianceStatus = VALUES(complianceStatus), sourceUrl = VALUES(sourceUrl), extractedAt = VALUES(extractedAt), recordHash = VALUES(recordHash)`,
      [record.code, record.year, record.number, authorId, record.type ?? "Tipo não informado pela fonte", record.locality, municipalityId, record.budgetFunction, record.budgetSubfunction, record.complianceStatus, record.source, record.sourceUrl, now, record.recordHash]
    );
    const [amendmentRows] = await connection.execute(
      "SELECT id FROM amendments WHERE code = ? AND year = ? LIMIT 1",
      [record.code, record.year]
    );
    const amendmentId = amendmentRows[0]?.id;
    if (!amendmentId) throw new Error(`Emenda ${record.code} não persistiu.`);
    await connection.execute("DELETE FROM execution_stages WHERE amendmentId = ?", [amendmentId]);
    const stages = [
      ["empenho", record.committed],
      ["liquidacao", record.settled],
      ["pagamento", record.paid],
      ["restos_inscritos", record.remainingRegistered],
      ["restos_cancelados", record.remainingCancelled],
      ["restos_pagos", record.remainingPaid],
    ].filter(([, amount]) => amount !== null);
    for (const [stage, amount] of stages) {
      await connection.execute(
        `INSERT INTO execution_stages (amendmentId, stage, amount, occurredAt, documentNumber, source, sourceUrl, extractedAt, recordHash)
         VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, ?)`,
        [amendmentId, stage, asDecimal(amount), record.source, record.sourceUrl, now, createHash("sha256").update(`${record.recordHash}:${stage}:${amount}`).digest("hex")]
      );
    }
    recordsPersisted += 1;
    if (recordsExtracted % 500 === 0) {
      console.error(JSON.stringify({ progress: recordsExtracted, recordsPersisted, municipalityLinked }));
    }
  }
  await completion;
  await connection.commit();
  await connection.execute(
    `UPDATE ingestion_runs
     SET status = 'completed', recordsExtracted = ?, recordsMatched = ?, matchRate = 0, finishedAt = ?, runHash = ?
     WHERE id = ?`,
    [recordsExtracted, 0, now, runHash.digest("hex"), runId]
  );
  await connection.execute(
    "UPDATE data_sources SET latestSuccessfulLoadAt = ?, latestAttemptAt = ?, status = 'available' WHERE id = ?",
    [now, now, sourceId]
  );
  console.log(JSON.stringify({ ok: true, year, recordsExtracted, recordsPersisted, municipalityLinked, sourceUrl: source.url }));
} catch (error) {
  try {
    await connection.rollback();
    if (runId) {
      await connection.execute(
        "UPDATE ingestion_runs SET status = 'failed', finishedAt = ?, errorSummary = ? WHERE id = ?",
        [new Date(), error instanceof Error ? error.message : "Erro desconhecido", runId]
      );
    }
  } catch {
    // Preserva o erro original da carga.
  }
  throw error;
} finally {
  await connection.end();
}
