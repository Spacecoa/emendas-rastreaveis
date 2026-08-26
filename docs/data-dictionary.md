# Dicionário de dados

Cada registro de domínio preserva **fonte**, **URL de origem**, **data de extração** e **hash do registro**. Campos que não aparecem na fonte são armazenados como `NULL`, e não como zero.

| Entidade                 | Finalidade                                                                   | Chave de conciliação / relação                                              | Proveniência obrigatória                                                |
| ------------------------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `authors`                | Parlamentar, bancada, comissão ou relator                                    | Código estável quando a fonte o publicar; nome normalizado na carga inicial | Fonte, URL, data e hash                                                 |
| `amendments`             | Registro orçamentário da emenda                                              | Código da emenda + ano                                                      | Fonte, URL, data e hash                                                 |
| `budget_programs`        | Programação e autorizado                                                     | Emenda + órgão + ação                                                       | Fonte, URL, data e hash                                                 |
| `execution_stages`       | Empenho, liquidação, pagamento e restos a pagar                              | Emenda + estágio + documento quando disponível                              | Fonte, URL, data e hash                                                 |
| `beneficiaries`          | Ente ou entidade recebedora                                                  | CNPJ; vínculo municipal quando houver                                       | Fonte, URL, data e hash                                                 |
| `instruments`            | Convênio, repasse, fundo a fundo ou transferência especial                   | Número do instrumento + beneficiário                                        | Fonte, URL, data e hash                                                 |
| `amendment_objects`      | Objeto oficial e tradução em linguagem simples                               | Emenda + instrumento                                                        | Fonte, URL, data e hash                                                 |
| `physical_milestones`    | Execução física ou finalística                                               | Instrumento + marco                                                         | Fonte, URL, data e hash                                                 |
| `accountabilities`       | Situação da prestação de contas                                              | Instrumento                                                                 | Fonte, URL, data e hash                                                 |
| `municipalities`         | Código IBGE, UF, população e geografia                                       | Código IBGE                                                                 | Fonte, URL, data e hash                                                 |
| `source_catalog_entries` | Beneficiário, objeto, instrumento ou chave de emenda oficial do Transferegov | Tipo + chave externa + hash; `amendmentId` só após conciliação              | Fonte, URL, data e hash                                                 |
| `compliance_alerts`      | Fatos que podem disparar aviso                                               | Emenda + tipo de alteração                                                  | Fonte, URL, data e hash                                                 |
| `ingestion_runs`         | Auditoria de cada carga                                                      | Fonte + início da execução                                                  | Ano, UF, registros extraídos, registros conciliados e taxa de casamento |

## Taxa de casamento e conciliação

A taxa de casamento é calculada sobre a unidade de análise publicada. Para a conciliação nacional entre CGU e Transferegov em 2025, a unidade é a **emenda CGU avaliada**: `emendas CGU com chave confirmada / emendas CGU avaliadas`.

O `code` da CGU para o exercício de 2025 contém um prefixo de exercício seguido pelo número de emenda. A plataforma compara **exatamente os oito últimos dígitos** desse código com o campo oficial `NR_EMENDA` do arquivo de emendas do Transferegov. Em 26 de agosto de 2026, **4.710 das 6.311 emendas CGU avaliadas** tiveram a chave confirmada, uma taxa de **74,63%**. As **61.402 linhas** de proposta correspondentes foram preservadas com URL de origem e hash individual; três combinações emenda/proposta repetidas na fonte permanecem distintas pelo hash da linha.

Somente objetos e instrumentos cujo `ID_PROPOSTA` aparece em uma linha já confirmada por essa regra recebem `amendmentId` e `reconciliationStatus = conciliado`. O vínculo comprova a correspondência documental entre as bases. **Ele não comprova entrega física, regularidade ou efetividade** e não altera o semáforo de cumprimento sem evidência oficial adicional.
