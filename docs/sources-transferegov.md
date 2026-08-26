# Fonte complementar: Transferegov — Transferências Especiais

A documentação oficial da API de dados abertos do Transferegov informa uma base pública PostgREST para Transferências Especiais e lista endpoints para `plano_acao_especial`, `empenho_especial`, ordens e histórico de pagamento, relatórios de gestão, metas, executores, planos de trabalho, finalidade e análises. A fonte é relevante para separar o fluxo financeiro da evidência de execução física e da prestação de contas.

| Finalidade na plataforma | Endpoint oficial candidato | Uso conservador planejado |
| --- | --- | --- |
| Instrumento e vigência | `plano_acao_especial` | Criar ou atualizar instrumento somente com chave de conciliação confirmada. |
| Execução financeira complementar | `empenho_especial`, `ordem_pagamento_ordem_bancaria_especial`, `historico_pagamento_especial` | Registrar fatos financeiros preservando URL e data de extração. |
| Execução física | `meta_especial`, `plano_trabalho_especial`, `finalidade_especial` | Permitir estado comprovado somente diante de evidência oficial suficientemente vinculada. |
| Prestação de contas e pendências | `relatorio_gestao_especial`, `relatorio_gestao_novo_especial`, `plano_trabalho_analise_especial`, `orgao_analise_pendente_especial` | Permitir pendência ou não cumprimento apenas quando a fonte trouxer sinal expresso aplicável. |

> Enquanto não houver chave de conciliação confirmada entre uma emenda da CGU e o registro de Transferência Especial, a plataforma mantém o estado **informação insuficiente**. O pagamento isolado não é usado como prova de entrega.

As regras do semáforo são deliberadamente condicionais: evidência física vinculada a pagamento conhecido permite **executada e comprovada**; sinal oficial de prestação de contas pendente ou vigência em atraso permite **pendência**; rejeição oficial ou vigência vencida sem entrega permite **não cumprida**. Sem uma dessas evidências, a plataforma não promove o status financeiro a conclusão finalística.

## Referência

[1]: https://docs.api.transferegov.gestao.gov.br/transferenciasespeciais/ "API de dados abertos do módulo de Transferências Especiais do Transferegov"
