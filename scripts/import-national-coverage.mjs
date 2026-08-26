import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import mysql from "mysql2/promise";

const inputDirectory = process.argv[2];
if (!inputDirectory) throw new Error("Informe o diretório com o manifest nacional.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não está configurada.");

const manifest = JSON.parse(await readFile(join(inputDirectory, "manifest.json"), "utf8"));
const states = Object.keys(manifest.states ?? {});
if (!states.length) throw new Error("O manifest não contém UFs para importar.");
const year = Number(manifest.year);
if (!Number.isInteger(year)) throw new Error("O manifest não contém ano válido.");

const readJsonl = async filename => (await readFile(join(inputDirectory, filename), "utf8"))
  .split("\n").filter(Boolean).map(line => JSON.parse(line));
const runHash = records => createHash("sha256")
  .update(JSON.stringify(records.map(record => record.record_hash ?? record.population_record_hash)))
  .digest("hex");

const sources = {
  beneficiaries: {
    name: "Transferegov — Proponentes",
    url: "https://repositorio.dados.gov.br/seges/detru/siconv_proponentes.csv.zip",
    licence: "Dados Abertos Transferegov.br",
    note: "Catálogo territorial oficial de proponentes. Registros sem chave de emenda comprovada permanecem não conciliados.",
  },
  objects: {
    name: "Transferegov — Propostas",
    url: "https://repositorio.dados.gov.br/seges/detru/siconv_proposta.csv.zip",
    licence: "Dados Abertos Transferegov.br",
    note: "Catálogo territorial oficial de propostas. Objetos sem chave de emenda comprovada permanecem não conciliados.",
  },
  instruments: {
    name: "Transferegov — Convênios",
    url: "https://repositorio.dados.gov.br/seges/detru/siconv_convenio.csv.zip",
    licence: "Dados Abertos Transferegov.br",
    note: "Catálogo territorial oficial de instrumentos. O vínculo com proposta não comprova emenda, execução física ou entrega.",
  },
  municipalities: {
    name: "IBGE — Municípios",
    url: "https://servicodados.ibge.gov.br/api/v1/localidades/estados",
    licence: "Dados Abertos IBGE",
    note: "Cadastro municipal oficial por UF, com URL de consulta preservada em cada registro.",
  },
  population: {
    name: `IBGE — Estimativas da População ${year}`,
    url: "https://ftp.ibge.gov.br/Estimativas_de_Populacao/Estimativas_2025/POP2025_20260113.ods",
    licence: "Dados Abertos IBGE",
    note: `Estimativa municipal com referência em 1º de julho de ${year}; usada apenas quando a emenda estiver vinculada ao código IBGE.`,
  },
};

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  const now = new Date();
  await connection.beginTransaction();

  const sourceIds = {};
  for (const [key, source] of Object.entries(sources)) {
    await connection.execute(
      `INSERT INTO data_sources (name, baseUrl, licence, latestSuccessfulLoadAt, latestAttemptAt, status, coverageNote)
       VALUES (?, ?, ?, ?, ?, 'available', ?)
       ON DUPLICATE KEY UPDATE latestSuccessfulLoadAt = VALUES(latestSuccessfulLoadAt), latestAttemptAt = VALUES(latestAttemptAt), status = VALUES(status)`,
      [source.name, source.url, source.licence, now, now, source.note],
    );
    const [rows] = await connection.execute("SELECT id FROM data_sources WHERE name = ? LIMIT 1", [source.name]);
    sourceIds[key] = rows[0]?.id;
    if (!sourceIds[key]) throw new Error(`Fonte não encontrada após upsert: ${source.name}`);
  }

  const totals = { beneficiaries: 0, objects: 0, instruments: 0, municipalities: 0, population: 0 };
  for (const uf of states) {
    const key = uf.toLowerCase();
    const [beneficiaries, objects, instruments, municipalities, population] = await Promise.all([
      readJsonl(`beneficiarios-${key}.jsonl`),
      readJsonl(`objetos-${key}-${year}.jsonl`),
      readJsonl(`instrumentos-${key}-${year}.jsonl`),
      readJsonl(`municipios-${key}.jsonl`),
      readJsonl(`populacao-${key}-${year}.jsonl`),
    ]);
    if (!beneficiaries.length || !objects.length || !municipalities.length || !population.length) {
      throw new Error(`O recorte de ${uf} está incompleto e não será importado.`);
    }
    if (municipalities.length !== population.length) {
      throw new Error(`Municípios e população de ${uf} têm quantidades divergentes.`);
    }

    for (const record of beneficiaries) {
      await connection.execute(
        `INSERT INTO beneficiaries (cnpj, name, beneficiaryType, municipalityId, source, sourceUrl, extractedAt, recordHash)
         VALUES (?, ?, ?, NULL, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE cnpj = VALUES(cnpj), name = VALUES(name), beneficiaryType = VALUES(beneficiaryType), extractedAt = VALUES(extractedAt), sourceUrl = VALUES(sourceUrl)`,
        [record.cnpj, record.name, record.beneficiary_type, record.source, record.source_url, new Date(record.extracted_at), record.record_hash],
      );
      await connection.execute(
        `INSERT INTO source_catalog_entries (recordKind, externalKey, cnpj, label, uf, referenceYear, reconciliationStatus, amendmentId, source, sourceUrl, extractedAt, recordHash)
         VALUES ('beneficiario', NULL, ?, ?, ?, NULL, 'nao_conciliado', NULL, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE cnpj = VALUES(cnpj), label = VALUES(label), uf = VALUES(uf), extractedAt = VALUES(extractedAt), sourceUrl = VALUES(sourceUrl)`,
        [record.cnpj, record.name, record.uf, record.source, record.source_url, new Date(record.extracted_at), record.record_hash],
      );
    }
    for (const record of [...objects, ...instruments]) {
      await connection.execute(
        `INSERT INTO source_catalog_entries (recordKind, externalKey, cnpj, label, uf, referenceYear, reconciliationStatus, amendmentId, source, sourceUrl, extractedAt, recordHash)
         VALUES (?, ?, ?, ?, ?, ?, 'nao_conciliado', NULL, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE label = VALUES(label), cnpj = VALUES(cnpj), uf = VALUES(uf), referenceYear = VALUES(referenceYear), extractedAt = VALUES(extractedAt), sourceUrl = VALUES(sourceUrl)`,
        [record.record_kind, record.external_key ?? null, record.cnpj, record.label, record.uf, record.reference_year, record.source, record.source_url, new Date(record.extracted_at), record.record_hash],
      );
    }
    for (const record of municipalities) {
      await connection.execute(
        `INSERT INTO municipalities (ibgeCode, name, uf, population, populationReferenceYear, populationSource, populationSourceUrl, populationExtractedAt, populationRecordHash, source, sourceUrl, extractedAt, recordHash)
         VALUES (?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), uf = VALUES(uf), source = VALUES(source), sourceUrl = VALUES(sourceUrl), extractedAt = VALUES(extractedAt), recordHash = VALUES(recordHash)`,
        [record.ibge_code, record.name, record.uf, record.source, record.source_url, new Date(record.extracted_at), record.record_hash],
      );
    }
    for (const record of population) {
      await connection.execute(
        `INSERT INTO municipalities (ibgeCode, name, uf, population, populationReferenceYear, populationSource, populationSourceUrl, populationExtractedAt, populationRecordHash, source, sourceUrl, extractedAt, recordHash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), uf = VALUES(uf), population = VALUES(population), populationReferenceYear = VALUES(populationReferenceYear), populationSource = VALUES(populationSource), populationSourceUrl = VALUES(populationSourceUrl), populationExtractedAt = VALUES(populationExtractedAt), populationRecordHash = VALUES(populationRecordHash), source = VALUES(source), sourceUrl = VALUES(sourceUrl), extractedAt = VALUES(extractedAt), recordHash = VALUES(recordHash)`,
        [record.ibge_code, record.name, record.uf, record.population, record.population_reference_year, record.population_source, record.population_source_url, new Date(record.population_extracted_at), record.population_record_hash, record.source, record.source_url, new Date(record.extracted_at), record.record_hash],
      );
    }

    const runs = [
      ["beneficiaries", null, beneficiaries],
      ["objects", year, objects],
      ["instruments", year, instruments],
      ["municipalities", null, municipalities],
      ["population", year, population],
    ];
    for (const [sourceKey, requestedYear, records] of runs) {
      await connection.execute(
        `INSERT INTO ingestion_runs (sourceId, requestedYear, requestedUf, status, recordsExtracted, recordsMatched, matchRate, finishedAt, runHash)
         VALUES (?, ?, ?, 'completed', ?, 0, 0, ?, ?)`,
        [sourceIds[sourceKey], requestedYear, uf, records.length, now, runHash(records)],
      );
    }

    totals.beneficiaries += beneficiaries.length;
    totals.objects += objects.length;
    totals.instruments += instruments.length;
    totals.municipalities += municipalities.length;
    totals.population += population.length;
  }
  await connection.commit();
  console.log(JSON.stringify({ ok: true, states, year, totals }));
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
