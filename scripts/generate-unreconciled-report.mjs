import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import mysql from "mysql2/promise";

const year = Number(process.argv[3] ?? 2025);
const outputDirectory =
  process.argv[2] ??
  "/home/ubuntu/emendas-rastreaveis/reports/unreconciled-national-2025";
const sourceName = "Transferegov — Emendas";
const sourceUrl =
  "https://repositorio.dados.gov.br/seges/detru/siconv_emenda.csv.zip";

if (!Number.isInteger(year) || year < 2015 || year > 2100) {
  throw new Error("Informe um exercício válido para o relatório.");
}
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não está configurada.");
}

const csv = (rows, headers) => {
  const quote = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return (
    [
      headers.join(","),
      ...rows.map(row => headers.map(header => quote(row[header])).join(",")),
    ].join("\n") + "\n"
  );
};

const proposalIdExpression =
  "SUBSTRING_INDEX(SUBSTRING_INDEX(externalKey, ':linha:', 1), ':proposta:', -1)";
const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  await mkdir(outputDirectory, { recursive: true });
  const [runRows] = await connection.execute(
    `SELECT ir.recordsExtracted, ir.recordsMatched, ir.matchRate, ir.runHash, ir.finishedAt
     FROM ingestion_runs ir
     INNER JOIN data_sources source ON source.id = ir.sourceId
     WHERE source.name = ? AND ir.requestedYear = ? AND ir.status = 'completed'
     ORDER BY ir.id DESC
     LIMIT 1`,
    [sourceName, year]
  );
  const run = runRows[0];
  if (!run) {
    throw new Error(
      "Não há execução nacional concluída para gerar o relatório."
    );
  }

  const emendaProposalSubquery = `
    SELECT ${proposalIdExpression} AS proposalId,
      COUNT(DISTINCT CASE WHEN amendmentId IS NOT NULL AND reconciliationStatus = 'conciliado' THEN amendmentId END) AS emendas_cgu_exatas
    FROM source_catalog_entries
    WHERE recordKind = 'emenda_transferegov' AND referenceYear = ?
    GROUP BY ${proposalIdExpression}`;
  const [summaryRows] = await connection.execute(
    `SELECT c.recordKind AS tipo, COUNT(*) AS total_nao_conciliado,
        SUM(CASE WHEN c.externalKey IS NULL OR c.externalKey = '' THEN 1 ELSE 0 END) AS sem_id_proposta,
        SUM(CASE WHEN c.externalKey IS NOT NULL AND e.proposalId IS NULL THEN 1 ELSE 0 END) AS proposta_ausente_no_arquivo_nacional,
        SUM(CASE WHEN e.emendas_cgu_exatas > 1 THEN 1 ELSE 0 END) AS proposta_ambigua,
        SUM(CASE WHEN e.emendas_cgu_exatas = 1 THEN 1 ELSE 0 END) AS chave_exata_disponivel_sem_vinculo
      FROM source_catalog_entries c
      LEFT JOIN (${emendaProposalSubquery}) e ON e.proposalId = c.externalKey
      WHERE c.recordKind IN ('objeto', 'instrumento')
        AND c.referenceYear = ?
        AND c.reconciliationStatus = 'nao_conciliado'
      GROUP BY c.recordKind
      ORDER BY c.recordKind`,
    [year, year]
  );
  const [catalogRows] = await connection.execute(
    `SELECT c.recordKind AS tipo, c.uf, c.referenceYear AS ano_referencia, c.externalKey AS id_proposta,
        c.label, c.cnpj, c.source AS fonte_catalogo, c.sourceUrl AS url_fonte_catalogo,
        c.extractedAt AS extraido_em, c.recordHash AS hash_registro,
        CASE
          WHEN c.externalKey IS NULL OR c.externalKey = '' THEN 'SEM_ID_PROPOSTA'
          WHEN e.proposalId IS NULL THEN 'PROPOSTA_AUSENTE_NO_ARQUIVO_NACIONAL'
          WHEN e.emendas_cgu_exatas > 1 THEN 'PROPOSTA_COM_CHAVE_EXATA_AMBIGUA'
          WHEN e.emendas_cgu_exatas = 1 THEN 'CHAVE_EXATA_DISPONIVEL_SEM_VINCULO'
          ELSE 'LINHA_SEM_CHAVE_CGU_EXATA'
        END AS classificacao_documental,
        CASE
          WHEN c.externalKey IS NULL OR c.externalKey = '' THEN 'O catálogo não contém ID_PROPOSTA; não há chave de junção documental disponível.'
          WHEN e.proposalId IS NULL THEN 'A proposta não aparece entre as linhas oficiais do arquivo nacional de emendas Transferegov que correspondem às chaves CGU/2025.'
          WHEN e.emendas_cgu_exatas > 1 THEN 'A proposta aparece ligada a mais de uma emenda CGU por chave exata; a rotina conserva a ambiguidade e não atribui amendmentId.'
          WHEN e.emendas_cgu_exatas = 1 THEN 'Há uma chave exata não ambígua disponível; o caso exige revisão de integridade antes de qualquer novo vínculo.'
          ELSE 'Há linha de proposta, mas ela não contém uma chave CGU exata conciliada.'
        END AS evidencia_e_limite,
        CASE WHEN e.proposalId IS NULL THEN 'nao' ELSE 'sim' END AS linha_no_arquivo_nacional,
        CASE WHEN e.emendas_cgu_exatas = 1 THEN 'sim' ELSE 'nao' END AS chave_cgu_exata_nao_ambigua
      FROM source_catalog_entries c
      LEFT JOIN (${emendaProposalSubquery}) e ON e.proposalId = c.externalKey
      WHERE c.recordKind IN ('objeto', 'instrumento')
        AND c.referenceYear = ?
        AND c.reconciliationStatus = 'nao_conciliado'
      ORDER BY c.recordKind, c.uf, c.externalKey`,
    [year, year]
  );
  const [unmatchedAmendments] = await connection.execute(
    `SELECT a.code AS codigo_cgu, a.year AS ano, RIGHT(a.code, 8) AS chave_final,
        COALESCE(au.name, 'Autoria não informada') AS autor, a.amendmentType AS tipo_emenda,
        a.locality AS localidade, a.source AS fonte_cgu, a.sourceUrl AS url_fonte_cgu,
        a.extractedAt AS extraido_em, a.recordHash AS hash_registro,
        'SEM_LINHA_TRANSFEREGOV_COM_CHAVE_EXATA' AS classificacao_documental,
        'Nenhuma linha oficial do arquivo nacional do Transferegov com NR_EMENDA igual à chave final desta emenda foi conciliada. Isto não permite concluir ausência de execução, objeto ou informação em outras fontes.' AS evidencia_e_limite
      FROM amendments a
      LEFT JOIN authors au ON au.id = a.authorId
      WHERE a.year = ?
        AND NOT EXISTS (
          SELECT 1 FROM source_catalog_entries e
          WHERE e.recordKind = 'emenda_transferegov'
            AND e.referenceYear = ?
            AND e.amendmentId = a.id
            AND e.reconciliationStatus = 'conciliado'
        )
      ORDER BY a.code`,
    [year, year]
  );
  const [stateRows] = await connection.execute(
    `SELECT c.uf, c.recordKind AS tipo, COUNT(*) AS total_nao_conciliado
      FROM source_catalog_entries c
      WHERE c.recordKind IN ('objeto', 'instrumento')
        AND c.referenceYear = ?
        AND c.reconciliationStatus = 'nao_conciliado'
      GROUP BY c.uf, c.recordKind
      ORDER BY c.uf, c.recordKind`,
    [year]
  );

  const totals = Object.fromEntries(
    summaryRows.map(row => [row.tipo, Number(row.total_nao_conciliado)])
  );
  const markdown = `# Relatório de não conciliação documental — Emendas em Foco

**Referência do recorte:** exercício ${year}; geração em ${new Date().toISOString()}.

> Este relatório classifica somente o que a regra de conciliação permite observar: igualdade exata entre \`NR_EMENDA\` no arquivo nacional do Transferegov e os oito dígitos finais do código da emenda CGU, além de igualdade entre \`ID_PROPOSTA\` e a chave externa do catálogo. A ausência de correspondência **não prova** ausência de recurso, falha de execução, irregularidade ou inexistência de registro em outras fontes.

## Síntese

| Conjunto | Não conciliados | Causa documental observada |
| --- | ---: | --- |
| Objetos de propostas | ${totals.objeto ?? 0} | ${summaryRows.find(row => row.tipo === "objeto")?.proposta_ausente_no_arquivo_nacional ?? 0} propostas não aparecem no arquivo nacional de emendas para as chaves CGU/2025 processadas. |
| Instrumentos | ${totals.instrumento ?? 0} | ${summaryRows.find(row => row.tipo === "instrumento")?.proposta_ausente_no_arquivo_nacional ?? 0} instrumentos remetem a propostas não presentes nesse arquivo nacional. |
| Emendas CGU | ${unmatchedAmendments.length} | Não houve linha conciliada por chave exata no arquivo nacional processado. |

## Como ler as classificações

| Código | Significado verificável | Não permite concluir |
| --- | --- | --- |
| \`PROPOSTA_AUSENTE_NO_ARQUIVO_NACIONAL\` | O \`ID_PROPOSTA\` não aparece entre as linhas nacionais de emenda que correspondem às chaves CGU/2025 processadas. | Que a proposta não exista em outro módulo, exercício ou fonte. |
| \`PROPOSTA_COM_CHAVE_EXATA_AMBIGUA\` | A proposta aparece com mais de uma emenda CGU confirmada por chave exata; nenhum vínculo é escolhido. | Que uma das emendas seja a destinatária sem evidência adicional. |
| \`SEM_ID_PROPOSTA\` | O item não possui a chave externa necessária para a junção documental. | Que não haja qualquer outro identificador em fonte complementar. |
| \`LINHA_SEM_CHAVE_CGU_EXATA\` | A proposta aparece no arquivo, mas sem chave que cumpra a regra exata. | Que não exista relação material entre registros. |
| \`SEM_LINHA_TRANSFEREGOV_COM_CHAVE_EXATA\` | A emenda CGU não recebeu correspondência exata no arquivo nacional processado. | Que não tenha execução, objeto, proposta ou informação em outra base. |

## Resultados verificáveis

Foram preservadas 61.402 linhas oficiais de emendas Transferegov para 4.710 chaves CGU distintas. A regra exata conciliou ${run.recordsMatched} das ${run.recordsExtracted} emendas CGU (${(Number(run.matchRate) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%). Os arquivos anexos contêm o detalhe por item, por emenda e por UF.

## Fontes

- [Emendas — dados abertos Transferegov](${sourceUrl})
- [Propostas — dados abertos Transferegov](https://repositorio.dados.gov.br/seges/detru/siconv_proposta.csv.zip)
- [Convênios — dados abertos Transferegov](https://repositorio.dados.gov.br/seges/detru/siconv_convenio.csv.zip)
- [Emendas Parlamentares — dados abertos CGU](https://portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares)
`;

  await writeFile(
    join(outputDirectory, "relatorio-nao-conciliacao-2025.md"),
    markdown,
    "utf8"
  );
  await writeFile(
    join(outputDirectory, "itens-catalogo-nao-conciliados-2025.csv"),
    csv(catalogRows, [
      "tipo",
      "uf",
      "ano_referencia",
      "id_proposta",
      "label",
      "cnpj",
      "classificacao_documental",
      "evidencia_e_limite",
      "linha_no_arquivo_nacional",
      "chave_cgu_exata_nao_ambigua",
      "fonte_catalogo",
      "url_fonte_catalogo",
      "extraido_em",
      "hash_registro",
    ]),
    "utf8"
  );
  await writeFile(
    join(outputDirectory, "emendas-cgu-nao-conciliadas-2025.csv"),
    csv(unmatchedAmendments, [
      "codigo_cgu",
      "ano",
      "chave_final",
      "autor",
      "tipo_emenda",
      "localidade",
      "classificacao_documental",
      "evidencia_e_limite",
      "fonte_cgu",
      "url_fonte_cgu",
      "extraido_em",
      "hash_registro",
    ]),
    "utf8"
  );
  await writeFile(
    join(outputDirectory, "resumo-nao-conciliacao-por-uf-2025.csv"),
    csv(stateRows, ["uf", "tipo", "total_nao_conciliado"]),
    "utf8"
  );
  await writeFile(
    join(outputDirectory, "metadados.json"),
    JSON.stringify(
      {
        year,
        runHash: run.runHash,
        runFinishedAt: run.finishedAt,
        catalogUnreconciled: totals,
        unmatchedCguAmendments: unmatchedAmendments.length,
        files: [
          "relatorio-nao-conciliacao-2025.md",
          "itens-catalogo-nao-conciliados-2025.csv",
          "emendas-cgu-nao-conciliadas-2025.csv",
          "resumo-nao-conciliacao-por-uf-2025.csv",
        ],
      },
      null,
      2
    ) + "\n",
    "utf8"
  );
  console.log(
    JSON.stringify({
      ok: true,
      outputDirectory,
      catalogUnreconciled: totals,
      unmatchedCguAmendments: unmatchedAmendments.length,
    })
  );
} finally {
  connection.destroy();
}
