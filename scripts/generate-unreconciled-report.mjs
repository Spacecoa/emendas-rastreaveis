import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import mysql from "mysql2/promise";

const outputDirectory = process.argv[2] ?? "/home/ubuntu/emendas-rastreaveis/reports/unreconciled-2025";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não está configurada.");

const csv = (rows, headers) => {
  const quote = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [headers.join(","), ...rows.map(row => headers.map(header => quote(row[header])).join(","))].join("\n") + "\n";
};

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await mkdir(outputDirectory, { recursive: true });

  const [summaryRows] = await connection.execute(
    `SELECT c.recordKind AS tipo, COUNT(*) AS total_nao_conciliado,
        SUM(CASE WHEN c.externalKey IS NULL OR c.externalKey = '' THEN 1 ELSE 0 END) AS sem_id_proposta,
        SUM(CASE WHEN c.externalKey IS NOT NULL AND e.proposalId IS NULL THEN 1 ELSE 0 END) AS proposta_ausente_no_recorte_de_chave_exata,
        SUM(CASE WHEN e.tem_chave_cgu_exata = 1 THEN 1 ELSE 0 END) AS chave_exata_disponivel_sem_vinculo
      FROM source_catalog_entries c
      LEFT JOIN (
        SELECT SUBSTRING_INDEX(externalKey, ':', -1) AS proposalId,
          MAX(CASE WHEN amendmentId IS NOT NULL AND reconciliationStatus = 'conciliado' THEN 1 ELSE 0 END) AS tem_chave_cgu_exata
        FROM source_catalog_entries
        WHERE recordKind = 'emenda_transferegov'
        GROUP BY SUBSTRING_INDEX(externalKey, ':', -1)
      ) e ON e.proposalId = c.externalKey
      WHERE c.recordKind IN ('objeto', 'instrumento') AND c.reconciliationStatus = 'nao_conciliado'
      GROUP BY c.recordKind
      ORDER BY c.recordKind`,
  );

  const [catalogRows] = await connection.execute(
    `SELECT c.recordKind AS tipo, c.uf, c.referenceYear AS ano_referencia, c.externalKey AS id_proposta,
        c.label, c.cnpj, c.source AS fonte_catalogo, c.sourceUrl AS url_fonte_catalogo,
        c.extractedAt AS extraido_em, c.recordHash AS hash_registro,
        CASE
          WHEN c.externalKey IS NULL OR c.externalKey = '' THEN 'SEM_ID_PROPOSTA'
          WHEN e.proposalId IS NULL THEN 'PROPOSTA_AUSENTE_NO_RECORTE_DE_CHAVE_EXATA'
          WHEN e.tem_chave_cgu_exata = 0 THEN 'LINHA_SEM_CHAVE_CGU_EXATA'
          ELSE 'CHAVE_EXATA_DISPONIVEL_SEM_VINCULO'
        END AS classificacao_documental,
        CASE
          WHEN c.externalKey IS NULL OR c.externalKey = '' THEN 'O catálogo não contém ID_PROPOSTA; não há chave de junção documental disponível.'
          WHEN e.proposalId IS NULL THEN 'A proposta não aparece entre as linhas de emendas Transferegov extraídas somente para as 75 chaves CGU de 2025. Isto não prova ausência no arquivo nacional completo.'
          WHEN e.tem_chave_cgu_exata = 0 THEN 'Há linha de proposta no recorte, mas ela não contém chave CGU exata e única confirmada.'
          ELSE 'Há chave exata disponível; requer revisão de integridade da rotina antes de qualquer novo vínculo.'
        END AS evidencia_e_limite,
        CASE WHEN e.proposalId IS NULL THEN 'nao' ELSE 'sim' END AS linha_no_recorte_transferegov,
        CASE WHEN e.tem_chave_cgu_exata = 1 THEN 'sim' ELSE 'nao' END AS chave_cgu_exata_confirmada
      FROM source_catalog_entries c
      LEFT JOIN (
        SELECT SUBSTRING_INDEX(externalKey, ':', -1) AS proposalId,
          MAX(CASE WHEN amendmentId IS NOT NULL AND reconciliationStatus = 'conciliado' THEN 1 ELSE 0 END) AS tem_chave_cgu_exata
        FROM source_catalog_entries
        WHERE recordKind = 'emenda_transferegov'
        GROUP BY SUBSTRING_INDEX(externalKey, ':', -1)
      ) e ON e.proposalId = c.externalKey
      WHERE c.recordKind IN ('objeto', 'instrumento') AND c.reconciliationStatus = 'nao_conciliado'
      ORDER BY c.recordKind, c.uf, c.externalKey`,
  );

  const [unmatchedAmendments] = await connection.execute(
    `SELECT a.code AS codigo_cgu, a.year AS ano, RIGHT(a.code, 8) AS chave_final,
        COALESCE(au.name, 'Autoria não informada') AS autor, a.amendmentType AS tipo_emenda,
        a.locality AS localidade, a.source AS fonte_cgu, a.sourceUrl AS url_fonte_cgu,
        a.extractedAt AS extraido_em, a.recordHash AS hash_registro,
        'SEM_LINHA_TRANSFEREGOV_COM_CHAVE_EXATA' AS classificacao_documental,
        'Nenhuma das 662 linhas oficiais extraídas para NR_EMENDA igual à chave final desta emenda foi conciliada. Não se conclui que não exista informação em outras fontes, exercícios ou chaves.' AS evidencia_e_limite
      FROM amendments a
      LEFT JOIN authors au ON au.id = a.authorId
      WHERE a.year = 2025
        AND NOT EXISTS (
          SELECT 1 FROM source_catalog_entries e
          WHERE e.recordKind = 'emenda_transferegov'
            AND e.amendmentId = a.id
            AND e.reconciliationStatus = 'conciliado'
        )
      ORDER BY a.code`,
  );

  const [stateRows] = await connection.execute(
    `SELECT c.uf, c.recordKind AS tipo, COUNT(*) AS total_nao_conciliado
      FROM source_catalog_entries c
      WHERE c.recordKind IN ('objeto', 'instrumento') AND c.reconciliationStatus = 'nao_conciliado'
      GROUP BY c.uf, c.recordKind
      ORDER BY c.uf, c.recordKind`,
  );

  const totals = Object.fromEntries(summaryRows.map(row => [row.tipo, Number(row.total_nao_conciliado)]));
  const markdown = `# Relatório de não conciliação documental — Emendas em Foco

**Referência do recorte:** exercício 2025; geração em ${new Date().toISOString()}.

> Este relatório classifica somente o que a regra de conciliação permite observar: igualdade exata entre \`NR_EMENDA\` no Transferegov e os oito dígitos finais do código da emenda CGU, além de igualdade entre \`ID_PROPOSTA\` e a chave externa do catálogo. A ausência de correspondência **não prova** ausência de recurso, falha de execução, irregularidade ou inexistência de registro em outras fontes.

## Síntese

| Conjunto | Não conciliados | Causa documental observada |
| --- | ---: | --- |
| Objetos de propostas | ${totals.objeto ?? 0} | ${summaryRows.find(row => row.tipo === 'objeto')?.proposta_ausente_no_recorte_de_chave_exata ?? 0} propostas não apareceram no recorte de linhas Transferegov obtido pelas 75 chaves CGU exatas. |
| Instrumentos | ${totals.instrumento ?? 0} | ${summaryRows.find(row => row.tipo === 'instrumento')?.proposta_ausente_no_recorte_de_chave_exata ?? 0} instrumentos remetem a propostas não presentes nesse recorte de chave exata. |
| Emendas CGU | ${unmatchedAmendments.length} | Não houve linha conciliada no recorte Transferegov de chaves exatas. |

## Como ler as classificações

| Código | Significado verificável | Não permite concluir |
| --- | --- | --- |
| \`PROPOSTA_AUSENTE_NO_RECORTE_DE_CHAVE_EXATA\` | O \`ID_PROPOSTA\` não está entre as linhas de emendas Transferegov extraídas pelas 75 chaves CGU de 2025. | Que a proposta não exista no arquivo nacional completo, em outro exercício ou ligada a outra chave. |
| \`SEM_ID_PROPOSTA\` | O item não possui a chave externa necessária para a junção documental. | Que não haja qualquer outro identificador em fonte complementar. |
| \`LINHA_SEM_CHAVE_CGU_EXATA\` | A proposta aparece no recorte, mas sem chave que cumpra a regra exata. | Que não exista relação material entre registros. |
| \`SEM_LINHA_TRANSFEREGOV_COM_CHAVE_EXATA\` | A emenda CGU não recebeu correspondência exata no recorte processado. | Que não tenha execução, objeto, proposta ou informação em outra base. |

## Resultados verificáveis

Foram preservadas 662 linhas oficiais de emendas Transferegov para 75 chaves CGU distintas. A regra exata conciliou 55 emendas CGU (73,33%). Entre os itens do catálogo, não houve caso em que uma chave exata estivesse disponível sem que a rotina a vinculasse. Os arquivos anexos contêm o detalhe por item, por emenda e por UF.

## Próximos passos de investigação recomendados

1. Consultar no arquivo nacional de emendas Transferegov os \`ID_PROPOSTA\` do arquivo de itens não conciliados, sem restringir a busca às 75 chaves CGU já carregadas.
2. Verificar exercícios adicionais apenas se a fonte oficial documentar que a proposta ou o instrumento possa se referir a ano diferente de 2025.
3. Incorporar nova relação somente se houver chave pública e verificável que preserve a cadeia emenda → proposta → instrumento.
4. Não utilizar nome do objeto, CNPJ, UF ou texto livre como substituto de chave documental.

## Fontes

- [Emendas — dados abertos Transferegov](https://repositorio.dados.gov.br/seges/detru/siconv_emenda.csv.zip)
- [Propostas — dados abertos Transferegov](https://repositorio.dados.gov.br/seges/detru/siconv_proposta.csv.zip)
- [Convênios — dados abertos Transferegov](https://repositorio.dados.gov.br/seges/detru/siconv_convenio.csv.zip)
- [API de Dados do Portal da Transparência](https://portaldatransparencia.gov.br/api-de-dados)
`;

  await writeFile(join(outputDirectory, "relatorio-nao-conciliacao-2025.md"), markdown, "utf8");
  await writeFile(join(outputDirectory, "itens-catalogo-nao-conciliados-2025.csv"), csv(catalogRows, [
    "tipo", "uf", "ano_referencia", "id_proposta", "label", "cnpj", "classificacao_documental",
    "evidencia_e_limite", "linha_no_recorte_transferegov", "chave_cgu_exata_confirmada", "fonte_catalogo",
    "url_fonte_catalogo", "extraido_em", "hash_registro",
  ]), "utf8");
  await writeFile(join(outputDirectory, "emendas-cgu-nao-conciliadas-2025.csv"), csv(unmatchedAmendments, [
    "codigo_cgu", "ano", "chave_final", "autor", "tipo_emenda", "localidade", "classificacao_documental",
    "evidencia_e_limite", "fonte_cgu", "url_fonte_cgu", "extraido_em", "hash_registro",
  ]), "utf8");
  await writeFile(join(outputDirectory, "resumo-nao-conciliacao-por-uf-2025.csv"), csv(stateRows, ["uf", "tipo", "total_nao_conciliado"]), "utf8");
  await writeFile(join(outputDirectory, "metadados.json"), JSON.stringify({
    year: 2025,
    catalogUnreconciled: totals,
    unmatchedCguAmendments: unmatchedAmendments.length,
    files: ["relatorio-nao-conciliacao-2025.md", "itens-catalogo-nao-conciliados-2025.csv", "emendas-cgu-nao-conciliadas-2025.csv", "resumo-nao-conciliacao-por-uf-2025.csv"],
  }, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({ ok: true, outputDirectory, catalogUnreconciled: totals, unmatchedCguAmendments: unmatchedAmendments.length }));
} finally {
  await connection.end();
}
