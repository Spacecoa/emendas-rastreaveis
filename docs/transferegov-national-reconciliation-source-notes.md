# Fonte da conciliação nacional Transferegov/2025

## Origem oficial

A página oficial de download do Transferegov para o módulo de Transferências Discricionárias e Legais informa que os CSVs são disponibilizados diariamente e aponta o arquivo de **Emendas Parlamentares** em:

<http://repositorio.dados.gov.br/seges/detru/siconv_emenda.csv.zip>

A própria página declara que a extração diária é concluída até as 9h e disponibiliza a data de atualização em:

<http://repositorio.dados.gov.br/seges/detru/data_carga_siconv.txt>

Fontes consultadas em 26 de agosto de 2026:

1. [Dados Abertos — Transferegov.br](https://www.gov.br/transferegov/pt-br/ferramentas-gestao/dados-abertos)
2. [Download de Dados Transferegov.br — Módulo Discricionárias e Legais](https://www.gov.br/transferegov/pt-br/ferramentas-gestao/dados-abertos/download-dados)

## Regra de uso nesta etapa

O download será usado apenas para obter o campo oficial `NR_EMENDA` e o identificador de proposta necessário à conciliação documental. Cada vínculo exige igualdade exata entre a chave final de oito dígitos da emenda CGU/2025 e `NR_EMENDA`; texto, CNPJ, nome, UF e aproximações numéricas não são critérios substitutos.

O arquivo é atualizado diariamente. Portanto, a execução deverá registrar data de carga, URL, tamanho, hash e o nome do membro CSV efetivamente processado antes de qualquer alteração na base.

## Evidência da aquisição nacional

A aquisição foi realizada em **26 de agosto de 2026** pelo endereço HTTPS do repositório oficial. O arquivo retornou `200 OK`, com `Content-Length` de **7.701.444 bytes**, `Last-Modified` de **17 de julho de 2026, 12:14:16 GMT** e `ETag` `"6a5a1c98-7583c4"`. A data publicada no próprio repositório para a carga foi **17/07/2026 06:30:47**.

| Campo              | Evidência observada                                                |
| ------------------ | ------------------------------------------------------------------ |
| Arquivo baixado    | `siconv_emenda.csv.zip`                                            |
| Membro processável | `siconv_emenda.csv`                                                |
| SHA-256 do ZIP     | `a68ef3c2053830a649b300bf82881c190b7f9b1d046e3441ffe873dff99cd923` |
| Delimitador        | Ponto e vírgula (`;`)                                              |
| Campos relevantes  | `ID_PROPOSTA`, `NR_EMENDA`, `NOME_PARLAMENTAR`, valores de repasse |

> Embora a página de download descreva arquivos diários, a execução preserva a data efetivamente publicada pelo repositório. Logo, a conciliação resultante descreve estritamente o conteúdo oficial disponível nessa data e não equivale a uma atualização em tempo real.

## Resultado da conciliação nacional

O recorte aplicou as **6.311 chaves CGU/2025** de oito dígitos ao campo `NR_EMENDA` e extraiu **61.402 linhas** do arquivo oficial. Foram encontradas **4.710 chaves CGU distintas** com correspondência exata, uma taxa de **74,63%**. As **1.601** chaves restantes permanecem explicitamente não conciliadas.

| Evidência da execução                                        |                                                          Resultado |
| ------------------------------------------------------------ | -----------------------------------------------------------------: |
| Linhas oficiais Transferegov preservadas                     |                                                             61.402 |
| Chaves CGU avaliadas                                         |                                                              6.311 |
| Emendas CGU conciliadas por `NR_EMENDA`                      |                                                              4.710 |
| Emendas CGU não conciliadas                                  |                                                              1.601 |
| Objetos de catálogo vinculados por proposta não ambígua      |                                                              1.231 |
| Instrumentos de catálogo vinculados por proposta não ambígua |                                                              1.182 |
| Vínculos sem igualdade exata verificados                     |                                                                  0 |
| Execução nacional (`ingestion_runs.runHash`)                 | `9957cdb67407f7e8f70a6836b0f94a4505112cb3a58a1a2b0768ce5e86ae7c96` |

As linhas oficiais são preservadas individualmente por hash, inclusive quando uma combinação de emenda e proposta se repete na origem. Para objetos e instrumentos, somente propostas associadas a uma única emenda CGU por chave exata recebem `amendmentId`; **842 propostas com mais de uma correspondência possível foram mantidas sem atribuição**.
