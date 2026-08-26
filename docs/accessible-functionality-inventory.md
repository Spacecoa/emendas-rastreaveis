# Funcionalidades acessíveis — Emendas em Foco

Este inventário descreve o que está acessível na versão atual da plataforma. A base financeira persistida cobre os exercícios de **2022 a 2025**. O dado ausente permanece como informação não disponível; nenhuma funcionalidade converte ausência em zero, estimativa ou conclusão sobre entrega física.

## Consultas públicas

| Funcionalidade | Onde acessar | O que permite | Limite atual |
| --- | --- | --- | --- |
| Página inicial e consulta guiada | `/` | Iniciar uma busca por texto, ano, UF, situação, valor mínimo, autoria e função. | A cobertura por UF exige vínculo territorial verificável; não há inferência por texto. |
| Busca avançada | `/busca` | Consultar emendas por autoria, localidade, código, número, função e subfunção; combinar filtros e compartilhar a URL. | Mostra apenas o recorte persistido que atende aos filtros. |
| Autocompletar | Consulta pública | Encontrar autoria, município, CNPJ, emenda e objeto com registros persistidos. | Nenhum resultado é inventado quando não há correspondência. |
| Detalhe da emenda | `/emendas/:code` | Consultar identificação, estágios financeiros, fonte, documento e linha do tempo disponível. | Empenho, liquidação e pagamento não comprovam entrega física. |
| Município | `/municipios/:name` | Consultar emendas pelo código IBGE, resumo financeiro e pagamento por habitante quando elegível. | O valor por habitante exige município IBGE único, população IBGE do ano e pagamento oficial; não mede entrega física. |
| Parlamentar/autoria | `/parlamentares/:name` | Ver recorte de emendas e estágios financeiros de uma autoria persistida. | Partido não é exibido nem inferido quando não está preenchido na fonte carregada. |
| Cobertura e rastreabilidade | `/cobertura` | Consultar cobertura por UF, fontes, hashes, conciliação e série anual de 2022–2025. | A conciliação Transferegov disponível é documental e está limitada a 2025. |
| Metodologia e glossário | `/metodologia` | Entender fontes, campos, regras, limites e trilha técnica da plataforma. | Não substitui a documentação original das fontes. |

## Painel anual e exportações

| Funcionalidade | Disponível | Regra de segurança e interpretação |
| --- | --- | --- |
| Série financeira anual | Sim | Mostra empenhado, liquidado e pago separadamente por exercício. As etapas não são somadas. |
| Filtro por autoria | Sim | Recalcula o painel somente com a autoria oficial selecionada e mantém o recorte na URL. |
| Filtro por partido | Visível, indisponível | A carga 2022–2025 não contém filiação partidária preenchida; nenhuma filiação foi deduzida. |
| Exportação do resumo em CSV | Sim | Baixa o recorte visual com autoria, valores, fonte, URL, geração UTC e limite de interpretação. |
| Exportação do resumo em PDF | Sim | Produz o mesmo recorte do painel e declara a indisponibilidade de partido quando aplicável. |
| Exportação de busca | Sim | Baixa o recorte da busca em CSV, JSON ou XLSX. |

## Dados, API e integração

| Recurso | Acesso | Escopo atual |
| --- | --- | --- |
| Dados financeiros CGU | Público na interface | Carga nacional persistida de 2022–2025, com proveniência, URL, data e hashes. |
| Conciliação Transferegov | Público na cobertura e detalhes | 2025: 4.710 de 6.311 emendas CGU conciliadas por igualdade exata de `NR_EMENDA`; vínculo documental não é prova de execução física. |
| Dados municipais IBGE | Público quando aplicável | População 2025 e vínculo municipal por código IBGE; ausência permanece indisponível. |
| REST e OpenAPI | Público | `GET /api/v1/emendas`, `GET /api/v1/sugestoes` e contrato em `/api/v1/openapi.json`. |
| Chat com os dados | `/chat` | Perguntas em linguagem simples sobre o contexto oficial persistido, com fontes retornadas separadamente. |
| GitHub | Integração de leitura ativa | Documentos acessíveis no perfil `Spacecoa`; READMEs confirmados em `Spacecoa/Projetos` e `Spacecoa/Transpar-ncia-estrat-gica-`. Nenhum repositório foi alterado. |

## Acessibilidade e segurança

| Capacidade | Estado |
| --- | --- |
| Navegação por teclado, foco visível e skip link | Disponível nas interfaces públicas. |
| Semântica, contraste, texto além de cor e redução de movimento | Aplicados e cobertos por auditorias automatizadas em páginas críticas. |
| Equivalência móvel para conteúdo tabular | Disponível na cobertura por meio de cartões com os mesmos campos essenciais. |
| Proteção de segredos | Chaves CGU e de IA ficam somente no servidor; não são expostas ao cliente nem a exportações. |
| Chat público | Histórico limitado localmente, entrada limitada e controle de frequência por origem; não grava conversas no banco. |

> **Limite central:** pagamento não é entrega; conciliação documental não é comprovação de execução física, regularidade ou irregularidade. Estados conclusivos dependem de fontes oficiais finalísticas ainda não integradas.

## Não acessível nesta versão

| Recurso | Situação |
| --- | --- |
| Publicação pública da versão | Suspensa até autorização explícita do usuário. |
| Atualização recorrente automática | Suspensa; exige publicação e uma rotina idempotente aprovada. |
| Estados conclusivos de execução física | Pendente de fontes oficiais adicionais sobre vigência, prestação de contas, objeto ou entrega. |
| Envio de e-mail e vídeo Bilibili | Eliminados do escopo por solicitação do usuário. |

## Referências

[1] [Portal da Transparência — CGU](https://portaldatransparencia.gov.br/)

[2] [Dados abertos do Transferegov.br](https://www.gov.br/transferegov/pt-br/ferramentas-gestao/dados-abertos/download-dados)

[3] [IBGE — População](https://www.ibge.gov.br/)
