# Fonte para carga financeira nacional

**Consulta em:** 26 de agosto de 2026

| Item | Evidência preservada |
| --- | --- |
| Página oficial de download | [Emendas Parlamentares — Portal da Transparência](https://portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares) informa que o arquivo segue o dicionário de dados correspondente. |
| Arquivo único oficial | `https://dadosabertos-download.cgu.gov.br/PortalDaTransparencia/saida/emendas-parlamentares/EmendasParlamentares.zip` — redirecionado pela página oficial de download. |
| Tamanho na consulta | 30.378.827 bytes no cabeçalho HTTP em 26 de agosto de 2026. |
| Conteúdo do ZIP | `EmendasParlamentares.csv`, `EmendasParlamentares_Convenios.csv` e `EmendasParlamentares_PorFavorecido.csv`. |
| Arquivo financeiro de emendas | `EmendasParlamentares.csv`; cabeçalho inclui código, ano, autoria, localidade, códigos IBGE, função, subfunção e valores empenhado, liquidado, pago e restos a pagar. |
| Codificação observada | O conteúdo é apresentado em codificação Windows-1252/Latin-1; o importador deve decodificar explicitamente e registrar ausência como `null`. |

> A página oficial da API da CGU informa limite de 400 requisições por minuto entre 06:00 e 23:59, 700 entre 00:00 e 05:59, e recomenda os dados abertos para acesso ao conjunto completo em grandes volumes. Esta carga usa o arquivo único; não envia o parâmetro `uf`, que não é documentado pela rota de emendas.

**Fonte adicional:** [API de Dados do Governo Federal — Portal da Transparência](https://portaldatransparencia.gov.br/api-de-dados).
