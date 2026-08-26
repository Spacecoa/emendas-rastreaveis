# Fonte complementar: Transferegov — Transferências Especiais

A documentação oficial da API de dados abertos do Transferegov informa uma base pública PostgREST para Transferências Especiais e lista endpoints para `plano_acao_especial`, `empenho_especial`, ordens e histórico de pagamento, relatórios de gestão, metas, executores, planos de trabalho, finalidade e análises. A fonte é relevante para separar o fluxo financeiro da evidência de execução física e da prestação de contas.

| Finalidade na plataforma | Endpoint oficial candidato | Uso conservador planejado |
| --- | --- | --- |
| Instrumento e vigência | `plano_acao_especial` | Criar ou atualizar instrumento somente com chave de conciliação confirmada. |
| Execução financeira complementar | `empenho_especial`, `ordem_pagamento_ordem_bancaria_especial`, `historico_pagamento_especial` | Registrar fatos financeiros preservando URL e data de extração. |
| Execução física | `meta_especial`, `plano_trabalho_especial`, `finalidade_especial` | Permitir estado comprovado somente diante de evidência oficial suficientemente vinculada. |
| Prestação de contas e pendências | `relatorio_gestao_especial`, `relatorio_gestao_novo_especial`, `plano_trabalho_analise_especial`, `orgao_analise_pendente_especial` | Permitir pendência ou não cumprimento apenas quando a fonte trouxer sinal expresso aplicável. |

> No recorte RJ/2025, a plataforma confirmou documentalmente 55 de 75 emendas CGU por igualdade exata entre os oito dígitos finais do código CGU e `NR_EMENDA` no arquivo oficial de emendas do Transferegov. O estado continua **informação insuficiente** enquanto não houver evidência finalística aplicável. O pagamento isolado e a conciliação documental não são usados como prova de entrega.

As regras do semáforo são deliberadamente condicionais: evidência física vinculada a pagamento conhecido permite **executada e comprovada**; sinal oficial de prestação de contas pendente ou vigência em atraso permite **pendência**; rejeição oficial ou vigência vencida sem entrega permite **não cumprida**. Sem uma dessas evidências, a plataforma não promove o status financeiro a conclusão finalística.

## Referência

[1]: https://docs.api.transferegov.gestao.gov.br/transferenciasespeciais/ "API de dados abertos do módulo de Transferências Especiais do Transferegov"

## Dados discricionários e legais para beneficiários e objetos

O Transferegov também publica arquivos CSV diários de transferências discricionárias e legais. Os conjuntos de propostas, convênios, emendas parlamentares, planos de aplicação detalhados, pagamentos a favorecidos, metas e proponentes são candidatos para preencher beneficiários, objetos, instrumentos e execução física sem inventar valores. A primeira carga deve ser limitada a um recorte e deve publicar a chave de conciliação, a taxa de casamento e as limitações antes de promover novos estados do semáforo.

| Entidade da plataforma | Arquivo oficial candidato | Uso planejado |
| --- | --- | --- |
| Beneficiário e CNPJ | `siconv_proponentes.csv.zip`, `siconv_pagamento.csv.zip` | Registrar a pessoa jurídica e manter sua proveniência por linha. |
| Objeto e instrumento | `siconv_proposta.csv.zip`, `siconv_convenio.csv.zip` | Registrar a descrição oficial do objeto e o número do instrumento. |
| Execução física | `siconv_meta_crono_fisico.csv.zip`, `siconv_etapa_crono_fisico.csv.zip` | Registrar metas e etapas sem inferir a entrega final. |

[2]: https://www.gov.br/transferegov/pt-br/ferramentas-gestao/dados-abertos/download-dados "Download de Dados Transferegov.br — Módulo Discricionárias e Legais"
