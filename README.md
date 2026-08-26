# Emendas em Foco

**Emendas em Foco** é uma plataforma pública para acompanhar emendas parlamentares brasileiras sem confundir o pagamento com a entrega do objeto. A interface apresenta a execução financeira e reserva a comprovação física para quando houver fonte oficial suficiente.

> **Princípio central:** nenhum dado ausente é convertido em zero, estimativa ou acusação. Toda informação exibida deve carregar origem, URL oficial, data de extração e hash do registro.

## O que esta primeira versão entrega

| Área | Implementação atual | Limite informado ao usuário |
| --- | --- | --- |
| Busca pública | Busca por autoria, localidade, código, número, função e subfunção em consulta oficial | Retorna uma página por vez até a expansão da carga persistida |
| Execução financeira | Empenho, liquidação, pagamento e restos a pagar da API CGU | Dotação e autorizado aguardam integração SIOP |
| Página da emenda | Linha do tempo, valores, situação, documento e link da fonte | A entrega física não é inferida da execução financeira |
| Município e parlamentar | Resumo do recorte, lista de emendas e escada financeira | Per capita e mapa aguardam conciliação IBGE |
| Exportação | CSV, JSON e XLSX do recorte visível | Reflete os registros retornados pela consulta atual |
| Transparência técnica | OpenAPI em `/api/v1/openapi.json`; REST em `/api/v1/emendas` | Cobertura nacional será declarada por carga |
| Acessibilidade | HTML semântico, skip link, foco visível, teclado, tabela equivalente, redução de movimento e teste axe | A auditoria deve seguir sendo ampliada por página |

## Dados oficiais e licenças

O primeiro conector usa a API do Portal da Transparência da CGU, que documenta a consulta de emendas e de documentos relacionados [1]. As próximas integrações previstas são SIOP [2], Transferegov [3], Câmara, Senado, IBGE e bases de controle. Os termos de uso e a licença de cada conjunto devem ser preservados quando a fonte for incorporada; a aplicação não reatribui licença aos dados públicos.

## Executar localmente

Instale Node 22+, Python 3.11+ e Docker. Configure `PORTAL_TRANSPARENCIA_API_KEY` no gerenciador de segredos do ambiente de execução. Para desenvolvimento local, exporte a variável apenas na sessão de terminal; não crie ou versione arquivos de ambiente com credenciais.

```bash
docker compose up --build
```

Para executar sem contêiner, use `pnpm install`, `pnpm check` e `pnpm dev`. A migração do banco é gerada por `pnpm drizzle-kit generate`; revise o SQL e aplique a alteração por uma migração controlada.

## ETL inicial

O script Python extrai uma página oficial, normaliza somente os campos publicados e produz JSONL com proveniência. A carga TypeScript persiste autoria, emenda e estágios financeiros no banco.

```bash
python3 etl/portal_transparencia.py --ano 2025 --uf RJ --saida /tmp/emendas-rj-2025.jsonl
pnpm exec tsx scripts/initial-load.mjs 2025 RJ 5
```

O segundo comando percorre até cinco páginas por execução (o limite seguro é dez), persiste somente os campos oficiais recebidos e registra em `ingestion_runs` os registros extraídos, registros conciliados e taxa de casamento. A agenda recorrente deve ser ativada apenas após a publicação da aplicação: ela chama `/api/scheduled/sync-official-sources` e valida a tarefa pelo identificador persistido, não por campos enviados na requisição.

## Qualidade e segurança

O projeto executa `pnpm check` e `pnpm test`. A suíte inclui normalização dos valores brasileiros, regra conservadora do semáforo, autenticação da chave da fonte oficial e auditoria axe de um componente de visualização com tabela equivalente. O workflow em `.github/workflows/quality.yml` executa esses controles a cada alteração.

Não coloque chaves no código, no README, em URLs, em logs ou em exportações. `PORTAL_TRANSPARENCIA_API_KEY` é usada apenas pelo servidor e deve ser criada pelo gerenciador de segredos do projeto.

## Documentação adicional

O [dicionário de dados](docs/data-dictionary.md) descreve as entidades e suas chaves. A [arquitetura](docs/architecture.md) registra os fluxos de fontes, persistência, API e cargas periódicas. A interface contém a página `/metodologia`, com glossário, regras do semáforo e limitações.

## Referências

[1]: https://api.portaldatransparencia.gov.br/ "API do Portal da Transparência — CGU"
[2]: https://www1.siop.planejamento.gov.br/siopdoc/doku.php/acesso_publico:dados_abertos "SIOP — Dados Abertos"
[3]: https://docs.api.transferegov.gestao.gov.br/transferenciasespeciais/ "API de dados abertos — Transferências Especiais do Transferegov"
