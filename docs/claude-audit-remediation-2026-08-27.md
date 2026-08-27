# Tratamento da auditoria de segurança do Claude

**Data da verificação:** 27 de agosto de 2026  
**Escopo revisado:** achados SEC-001, SEC-002, SEC-003, SEC-005 e SEC-006 enviados para o projeto, além da questão de isolamento de sessão por aplicação.

> Este registro descreve o que foi confirmado no código, a correção aplicada e o que ainda não pode ser comprovado somente dentro deste projeto. Ele não contém credenciais, cookies, URLs presignadas nem instruções de alteração automática.

| Achado                                           | Parecer no código                                                                                                             | Tratamento aplicado                                                                                                                                                                                                           | Situação                                                             |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **SEC-001** — proxy de armazenamento anônimo     | **Confirmado.** A rota aceitava uma chave livre e pedia uma URL assinada ao serviço interno. O produto não chamava essa rota. | A rota e seu registro foram removidos. Os helpers de armazenamento, caso usados no futuro pelo servidor, passam a pedir uma URL assinada diretamente; não há mais caminho público que aceite uma chave arbitrária.            | Corrigido e coberto por teste de regressão.                          |
| **SEC-002** — consultas repetidas por emenda     | **Confirmado.** A busca recuperava códigos e então fazia consultas individuais de emenda e estágio.                           | A busca e a página municipal agora carregam emendas e etapas em lote. Para uma página de até 40 resultados, a consulta usa uma seleção de códigos e duas leituras em lote, em vez de duas leituras por código.                | Corrigido e compatível com a base persistida.                        |
| **SEC-005** — curingas e falta de limite público | **Confirmado.** Os valores de busca entravam em `LIKE` sem tratar `%`, `_` e `\`. Não havia limite HTTP comum.                | Curingas agora são texto literal. Entradas textuais recebem tamanho máximo. As rotas REST e tRPC públicas recebem limite de 120 requisições por minuto por cliente; o chat mantém o teto adicional de 8 perguntas por minuto. | Corrigido no processo da aplicação; ver ressalva operacional abaixo. |
| **SEC-003** — IP do chat atrás de proxy          | **Confirmado.** O chat usava `req.ip` sem declarar o proxy confiável.                                                         | A aplicação confia apenas no proxy imediatamente anterior (`trust proxy = 1`) e usa uma chave única de cliente nos limites HTTP e do chat.                                                                                    | Corrigido e testado com `X-Forwarded-For`.                           |
| **SEC-006** — paginação sem ordem explícita      | **Confirmado.** A busca aplicava `LIMIT` e `OFFSET` sem `ORDER BY`.                                                           | Resultados e leituras em lote são ordenados por código da emenda e ID como desempate. A exportação continua usando exatamente a ordem da busca.                                                                               | Corrigido e testado com duas leituras iguais da mesma página.        |
| Sessão entre aplicações                          | **Confirmado no código.** O token carregava `appId`, mas esse valor não era comparado ao identificador desta aplicação.       | `verifySession` agora rejeita token cujo `appId` não seja o desta aplicação.                                                                                                                                                  | Mitigação aplicada; ver confirmação pendente abaixo.                 |

## Compatibilidade com as bases carregadas

As correções não alteram tabelas, registros, valores ou regras de interpretação. A consulta de integridade após a mudança confirmou os mesmos totais persistidos abaixo.

| Exercício | Emendas | Estágios financeiros |            Empenhado |            Liquidado |                 Pago |
| --------- | ------: | -------------------: | -------------------: | -------------------: | -------------------: |
| 2022      |   6.108 |               36.648 | R$ 25.458.155.910,19 | R$ 17.230.607.388,21 | R$ 17.032.527.467,49 |
| 2023      |   6.059 |               36.354 | R$ 35.247.659.122,58 | R$ 21.937.884.356,29 | R$ 21.794.682.215,75 |
| 2024      |   6.986 |               41.916 | R$ 44.780.175.550,47 | R$ 31.480.063.935,01 | R$ 31.366.486.593,43 |
| 2025      |   6.311 |               37.866 | R$ 50.905.200.171,13 | R$ 32.819.782.336,69 | R$ 32.479.836.877,66 |

Os filtros territoriais permanecem estritos: só retornam emendas com código IBGE vinculado ou documento conciliado no catálogo. A mudança não permite inferência de UF por texto, não altera a conciliação Transferegov de 2025 e não transforma pagamento em prova de entrega.

## Validações realizadas

Foram aprovados os testes novos de caracteres curingas literais, limite por cliente atrás de proxy, remoção do proxy de armazenamento e rejeição de sessão de outra aplicação. A suíte sem a dependência externa indisponível aprovou **30 arquivos, 65 testes e 1 teste de e-mail pulado**. Tipagem, formatação, verificação de diferenças e build também passaram.

O único teste não concluído na rodada integral foi a consulta ao Portal da Transparência: a conexão HTTPS externa expirou antes de chegar à API, inclusive em verificação sem credencial. Isso é indisponibilidade de rede/fornecedor no momento da validação, não falha das bases persistidas nem das correções locais.

## Confirmações ainda necessárias

O comparativo de `appId` impede que um token comum de outra aplicação seja aceito aqui. Ainda assim, é preciso confirmar com a plataforma que **`JWT_SECRET` é exclusivo por projeto**. Se múltiplas aplicações compartilhassem a mesma chave e uma delas fosse comprometida, ela poderia assinar um novo token declarando o `appId` deste projeto. Essa propriedade não é observável nem configurável pelo código do projeto.

O limite de requisições é mantido pela instância que atende a chamada. Para proteção agregada entre múltiplas instâncias de hospedagem, é necessária uma regra equivalente no gateway/edge ou um armazenamento distribuído de limites. A proteção atual reduz o abuso por cliente em cada instância, mas não substitui uma política da infraestrutura contra tráfego distribuído.

Também não foram fornecidos os detalhes dos outros achados da auditoria mencionada. Eles devem ser encaminhados com identificador, arquivo, linha, cenário de reprodução e impacto para revisão verificável, sem incluir segredos.
