# Verificações de interface

## 26 de agosto de 2026

A página inicial, a busca pública e a metodologia foram verificadas em visualização de desktop. A busca com recorte vazio apresenta agora a mensagem **"Nenhum registro encontrado para este recorte"**, sem concluir que não houve conciliação. O estado informa que filtros e termos podem ser revistos e mantém, separadamente, o limite de vinculação de CNPJ e objeto por chaves verificáveis.

A página de metodologia continua distinguindo execução financeira de comprovação de entrega física. A carga de população municipal do IBGE foi persistida com referência em 1º de julho de 2025, mas nenhum indicador per capita foi publicado: ele permanece condicionado ao vínculo verificável entre a emenda e o código municipal do IBGE.

A busca foi também verificada em viewport móvel de 375 × 812 px. Os filtros passam a uma coluna, o botão de consulta ocupa largura adequada ao toque e a mensagem de recorte vazio mantém contraste, hierarquia e leitura sem sobreposição horizontal.

## Transparência de cobertura e rodapé — 26 de agosto de 2026

A página inicial foi verificada em desktop e em viewport móvel de 375 × 812 px. A área de cobertura mostra totais persistidos, a taxa de conciliação de 55/75 (73,33%) e o limite de que vínculo documental não confirma execução física. O acesso rápido apresenta somente a UF com cobertura municipal e população oficial carregada, com controles de ordenação por A–Z e população. No celular, os indicadores, o card de UF e as quatro colunas institucionais do rodapé fluem em coluna única, sem sobreposição horizontal.

## Filtros combináveis — 26 de agosto de 2026

A busca foi verificada em desktop com os parâmetros compartilháveis `autor=GENERAL GIRAO` e `funcao=Defesa nacional`. O recorte retornou uma emenda oficial compatível e manteve os controles de exportação. Após acrescentar autoria e função, a grade de filtros foi ajustada para quatro colunas em desktop comum, evitando extrapolação horizontal; a grade completa fica reservada a telas muito largas.

## Precisão de páginas de entidade — 26 de agosto de 2026

A rota municipal sem correspondência foi verificada em desktop. Em vez de reutilizar registros de fallback, a página apresenta um estado vazio claro e oferece acesso à nova consulta. Não foram mostrados valores financeiros, emendas ou indicadores pertencentes a outro município.

## Página de parlamentar e semântica — 26 de agosto de 2026

A página de parlamentar `GENERAL GIRAO` foi verificada em desktop após a correção de links e landmarks. O recorte exibe uma emenda oficial, fonte clicável, valores financeiros e a alternativa tabular da execução. A mensagem sobre população do IBGE esclarece que o dado está carregado para RJ/2025, mas não habilita per capita sem código municipal verificável; não houve extrapolação visual ou semântica.

## Check-up geral pré-publicação — 26 de agosto de 2026

| Área verificada | Evidência e resultado |
| --- | --- |
| Tipagem, testes e diff | `pnpm check && pnpm test && git diff --check` foi executado. A suíte atual concluiu com 19 arquivos aprovados, 27 testes aprovados e 1 teste de Resend pulado por depender de remetente verificado, que permanece pendente por decisão do projeto. Não houve erro de espaço em branco no diff. |
| Integridade persistida | Consultas SQL encontraram zero emendas duplicadas, zero emendas sem URL ou hash, zero estágios órfãos, zero catálogos conciliados sem emenda, zero municípios com população sem fonte/ano e zero fontes sem última tentativa. |
| Segurança de segredo | A busca pelo identificador da chave CGU no diretório cliente não retornou ocorrências. A chave continua usada somente no servidor por variável de ambiente e não foi exibida durante a checagem. |
| API pública | `GET /api/v1/emendas` com autoria e função retornou HTTP 200 e a emenda oficial esperada. `GET /api/v1/openapi.json` retornou HTTP 200 e documenta `autor` e `funcao`. |
| Interface e console atual | Após reinício às 03:06 UTC-3, a API voltou a responder e a página de parlamentar foi verificada visualmente. Não houve erro de console posterior ao reinício. O arquivo de log do servidor ainda conserva dois `SyntaxError` de recargas anteriores, às 01:48 e 02:31; eles são históricos, anteriores ao reinício, às correções e à suíte atual aprovada. |

> A publicação continua suspensa. A próxima carga de UF será executada como etapa isolada, validada e apresentada para autorização explícita antes de avançar para outra UF.

## Limitação territorial da rota CGU de emendas — 26 de agosto de 2026

Ao validar a documentação OpenAPI oficial da rota `/api-de-dados/emendas`, foram encontrados apenas os parâmetros `codigoEmenda`, `numeroEmenda`, `nomeAutor`, `tipoEmenda`, `ano`, `codigoFuncao`, `codigoSubfuncao` e `pagina`. O parâmetro `uf` **não está documentado** nessa rota. A consulta executada com `uf=SP` retornou 75 registros oficiais com hash e proveniência, mas suas localidades incluem "Nacional" e várias UFs; portanto, ela não comprova cobertura territorial de São Paulo.

Os registros foram preservados como **amostra oficial parcial de 2025**, e o histórico de ingestão e a nota de cobertura da CGU foram atualizados para explicitar a limitação. Nenhuma página pública deve chamar essa amostra de "dados de SP". A expansão de UFs deverá usar uma fonte ou chave territorial oficialmente documentada, antes de nova carga.

**Fonte:** [documentação OpenAPI oficial da API de Dados do Portal da Transparência](https://api.portaldatransparencia.gov.br/swagger-ui/index.html) e [página oficial da API de Dados da CGU](https://portaldatransparencia.gov.br/api-de-dados).

## Etapa territorial MG/2025 — 26 de agosto de 2026

Após autorização explícita, a cobertura de Minas Gerais foi carregada exclusivamente a partir de chaves territoriais documentadas no Transferegov e de cadastros/estimativas oficiais do IBGE. Foram persistidos 200 beneficiários, 200 objetos de propostas, 45 instrumentos, 853 municípios e 853 estimativas de população municipal com referência em 2025. Cada estimativa de população de MG possui ano, URL de origem e hash; nenhuma ficou sem proveniência.

| Evidência | Resultado validado |
| --- | --- |
| Catálogo territorial | 200 beneficiários, 200 objetos e 45 instrumentos de MG; os objetos e instrumentos foram mantidos como `nao_conciliado`, com `amendmentId` ausente. Portanto, eles não são apresentados como prova de execução física nem como vínculo com uma emenda CGU. |
| Cobertura IBGE | 853 municípios de MG e 853 populações de referência 2025, totalizando 21.393.441 habitantes na soma dos municípios persistidos. |
| Integridade da execução | As quatro execuções MG foram concluídas e registraram hash: Proponentes (200), Propostas (200), Convênios (45) e Estimativas da População 2025 (853). |
| Correção de proveniência | O extrator de instrumentos passou a receber UF e ano do registro de proposta que documenta o recorte. A reimportação confirmou 45/45 instrumentos em MG/2025, sem associação a emenda. |
| Qualidade e interface | `pnpm check && pnpm test && git diff --check` concluiu sem falhas: 19 arquivos de teste aprovados, 30 testes aprovados e 1 teste de Resend pulado pelo remetente ainda pendente. A página inicial foi conferida em desktop e em 375 × 812 px: MG aparece antes de RJ na ordenação A–Z, com 853 municípios e a população oficial exibida. |

> A taxa pública de 55/75 (73,33%) continua sendo a conciliação documental específica já publicada para a amostra financeira CGU/Transferegov. Ela não foi estendida a MG e não confirma entrega física, execução municipal ou aplicação de recursos.

**Fontes da etapa:** dados abertos de [Proponentes do Transferegov](https://repositorio.dados.gov.br/seges/detru/siconv_proponente.csv.zip), [Propostas do Transferegov](https://repositorio.dados.gov.br/seges/detru/siconv_proposta.csv.zip) e [Convênios do Transferegov](https://repositorio.dados.gov.br/seges/detru/siconv_convenio.csv.zip); [municípios do IBGE](https://servicodados.ibge.gov.br/api/v1/localidades/estados/MG/municipios) e [Estimativas da População 2025 do IBGE](https://ftp.ibge.gov.br/Estimativas_de_Populacao/Estimativas_2025/POP2025_20260113.ods).

## Expansão nacional e check-up de integridade — 26 de agosto de 2026

Após autorização para seguir diretamente com todas as UFs restantes, foram extraídos de uma única leitura das bases nacionais do Transferegov os recortes de AC, AL, AP, AM, BA, CE, DF, ES, GO, MA, MT, MS, PA, PB, PR, PE, PI, RN, RS, RO, RR, SC, SP, SE e TO. Para cada UF, o recorte preserva a URL da fonte, a data de extração e o hash de cada linha. O cadastro de localidades e as estimativas municipais foram consultados diretamente em fontes oficiais do IBGE.[1] [2]

| Dimensão | Novos registros | Total público persistido após a expansão | Verificação de integridade |
| --- | ---: | ---: | --- |
| Beneficiários territoriais | 5.000 | 5.400 | 200 por UF nas 27 UFs; URL e hash presentes. |
| Objetos de propostas | 5.000 | 5.400 | 200 por UF nas 27 UFs; catálogo separado da emenda. |
| Instrumentos | 1.653 | 1.812 | De 26 a 161 por UF; URL e hash presentes. |
| Registros municipais e população 2025 | 4.626 | 5.571 | 27 UFs, população em todos os registros, com ano, URL e hash. |

O total de 5.571 registros territoriais segue a resposta oficial do IBGE, que inclui Brasília na consulta do Distrito Federal. A interface mantém a denominação técnica já usada pelo catálogo de municípios e preserva a fonte clicável em cada UF.[3]

> Os 5.200 beneficiários e objetos, além dos 1.698 instrumentos das UFs fora do RJ, estão marcados como `nao_conciliado` e sem `amendmentId`. A expansão de cobertura territorial **não** cria prova de vínculo com emenda CGU, execução financeira, execução física ou entrega.

O check-up posterior confirmou zero entradas de catálogo sem URL ou hash, zero registros municipais sem URL ou hash, zero emendas duplicadas, zero estágios de execução órfãos e zero populações sem proveniência. Os endpoints `GET /api/v1/emendas?ano=2025&uf=MG&limit=1` e `GET /api/v1/openapi.json` responderam HTTP 200. A chave da CGU não foi encontrada no diretório cliente, e os logs desde 03:30 UTC-3 não registraram erro. `pnpm check && pnpm test && git diff --check` concluiu com 19 arquivos de teste aprovados, 30 testes aprovados e 1 teste de Resend pulado porque o remetente externo continua pendente. A home foi verificada em desktop e em 375 × 812 px, exibindo 27 UFs e os controles de ordenação sem sobreposição.

**Referências**

[1] [Proponentes, propostas e convênios — dados abertos Transferegov](https://repositorio.dados.gov.br/seges/detru/)

[2] [API de Localidades e Estimativas da População 2025 — IBGE](https://servicodados.ibge.gov.br/api/docs/localidades)

[3] [Brasília (DF) — Cidades e Estados, IBGE](https://www.ibge.gov.br/cidades-e-estados/df/brasilia.html)
