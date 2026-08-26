# Notas de fonte — carga financeira histórica CGU

## Referências verificadas em 26 de agosto de 2026

| Referência                                                                                                                                                | Evidência observada                                                                                                                                                                                                                   | Uso na plataforma                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [Consulta de Emendas do Portal da Transparência](https://portaldatransparencia.gov.br/emendas/consulta)                                                   | A consulta oficial disponibiliza filtros por ano da emenda, código, autor, função e estágios financeiros. A página indicava atualização até 24 de agosto de 2026 no momento da verificação.                                           | Referência funcional e semântica para os campos financeiros exibidos.                  |
| [Arquivo nacional de emendas da CGU](https://dadosabertos-download.cgu.gov.br/PortalDaTransparencia/saida/emendas-parlamentares/EmendasParlamentares.zip) | Arquivo ZIP nacional de 30.378.827 bytes, HTTP 200, `Last-Modified: 2026-08-26T00:29:48Z`, ETag `5e0117bad74a4ae5374eb78b8ac758f6-4` e SHA-256 `3352c67150012d369b2afee1007d221f0cf42f0bea78f0a8057ebc896086b85e` na cópia analisada. | Fonte de ingestão financeira por exercício, sem parâmetro territorial não documentado. |

| Exercício | Linhas identificadas no CSV nacional |
| --------- | -----------------------------------: |
| 2022      |                                6.108 |
| 2023      |                                6.110 |
| 2024      |                                6.990 |
| 2025      |                                6.311 |

> A consulta pública comprova que o Portal da Transparência admite filtro por ano da emenda. A cópia oficial analisada contém registros para 2022–2025 e mantém o cabeçalho compatível com o importador existente, incluindo código, ano, autor, localidade, código IBGE e estágios de empenho, liquidação, pagamento e restos a pagar. A plataforma somente afirmará cobertura carregada de cada exercício após processamento idempotente e validação dos registros persistidos.

Não será usada inferência por UF, texto livre, CNPJ ou pagamento para criar vínculo territorial, entrega física, regularidade ou irregularidade.

## Resultado da carga manual idempotente

| Exercício | Emendas persistidas | Estágios financeiros | Vínculos por código municipal IBGE |
| --------- | ------------------: | -------------------: | ---------------------------------: |
| 2022      |               6.108 |               36.648 |                              1.458 |
| 2023      |               6.059 |               36.354 |                              1.401 |
| 2024      |               6.986 |               41.916 |                              1.168 |
| 2025      |               6.311 |               37.866 |                                759 |

As diferenças entre linhas do arquivo e emendas persistidas em 2023 e 2024 correspondem a linhas oficiais com a mesma chave `código + exercício`. O modelo de dados trata essa chave como uma única emenda; o último registro oficial do mesmo código atualiza seus campos financeiros sem criar duplicidade. A validação posterior confirmou que não há chave duplicada no banco.
