# Emendas em Foco

**Emendas em Foco** é uma plataforma pública para acompanhar emendas parlamentares brasileiras sem confundir o pagamento com a entrega do objeto. A interface apresenta a execução financeira e reserva a comprovação física para quando houver fonte oficial suficiente.

> **Princípio central:** nenhum dado ausente é convertido em zero, estimativa ou acusação. Toda informação exibida deve carregar origem, URL oficial, data de extração e hash do registro.

## O que esta primeira versão entrega

| Área | Implementação atual | Limite informado ao usuário |
| --- | --- | --- |
| Busca pública | Busca por autoria, localidade, código, número, função e subfunção em consulta oficial | Retorna uma página por vez até a expansão da carga persistida; cobertura por UF só é declarada quando a fonte oferece chave territorial documentada |
| Execução financeira | Empenho, liquidação, pagamento e restos a pagar da API CGU | Dotação e autorizado aguardam integração SIOP |
| Página da emenda | Linha do tempo, valores, situação, documento e link da fonte | A entrega física não é inferida da execução financeira |
| Município e parlamentar | Resumo do recorte, lista de emendas e escada financeira | A população IBGE RJ/2025 está carregada; per capita e mapa aguardam vínculo verificável da emenda ao código municipal |
| Exportação | CSV, JSON e XLSX do recorte visível | Reflete os registros retornados pela consulta atual |
| Transparência técnica | OpenAPI em `/api/v1/openapi.json`; REST em `/api/v1/emendas` e `/api/v1/sugestoes` | Amostras CGU não são apresentadas como cobertura nacional ou por UF sem uma chave territorial oficial |
| Acessibilidade | HTML semântico, skip link, foco visível, teclado, tabela equivalente, redução de movimento e teste axe | A auditoria deve seguir sendo ampliada por página |

## Dados oficiais e licenças

O primeiro conector usa a API do Portal da Transparência da CGU, que documenta a consulta de emendas e de documentos relacionados [1]. A rota de emendas documenta filtros por código, número, autoria, tipo, ano, função, subfunção e página — **não por UF**. Por isso, suas cargas de 2025 são tratadas como amostras oficiais parciais, sem alegação de cobertura territorial. A carga complementar usa arquivos diários de proponentes, propostas, convênios e emendas do Transferegov, além de localidades e estimativas de população do IBGE [3] [4]. No recorte territorialmente comprovado de RJ/2025, 55 das 75 emendas CGU têm correspondência exata pelo `NR_EMENDA` do Transferegov. Objetos e instrumentos só recebem vínculo após essa chave; o vínculo é documental e **não prova entrega física**. Os termos de uso e a licença de cada conjunto são preservados; a aplicação não reatribui licença aos dados públicos.

## Executar localmente

Instale Node 22+, Python 3.11+ e Docker. Configure `PORTAL_TRANSPARENCIA_API_KEY` no gerenciador de segredos do ambiente de execução. Para desenvolvimento local, exporte a variável apenas na sessão de terminal; não crie ou versione arquivos de ambiente com credenciais.

```bash
docker compose up --build
```

Para executar sem contêiner, use `pnpm install`, `pnpm check` e `pnpm dev`. A migração do banco é gerada por `pnpm drizzle-kit generate`; revise o SQL e aplique a alteração por uma migração controlada.

## Carga financeira nacional

Para conjunto completo, a orientação oficial da CGU é utilizar os dados abertos em vez de percorrer a API paginada. O importador abaixo lê o arquivo único oficial, filtra o exercício solicitado, persiste autoria, emenda e estágios financeiros em transação e registra URL, data, hash por registro e hash da execução.

```bash
curl -fL -o /tmp/EmendasParlamentares.zip \
  https://dadosabertos-download.cgu.gov.br/PortalDaTransparencia/saida/emendas-parlamentares/EmendasParlamentares.zip
pnpm tsx scripts/import-cgu-national-financial.mjs /tmp/EmendasParlamentares.zip 2025
```

O arquivo único contém emendas, convênios e favorecidos; a rotina financeira lê somente `EmendasParlamentares.csv`. O código municipal é associado apenas quando corresponde a um cadastro IBGE já persistido. Não use o parâmetro `uf` na rota CGU para declarar cobertura estadual: ele não é documentado. A API paginada permanece útil para consultas pontuais e sanity checks, mas não substitui a carga nacional. A agenda recorrente continua desativada até publicação e autorização explícita.

### Carga complementar do Transferegov e do IBGE

As cargas abaixo extraem somente um recorte controlado. Beneficiários, objetos e instrumentos são guardados com URL, data e hash. Para RJ/2025, a conciliação compara os oito últimos dígitos do código CGU com `NR_EMENDA`: 55 de 75 emendas foram vinculadas documentalmente. Registros sem essa chave permanecem não conciliados, e nenhum vínculo é apresentado como evidência de entrega física.

```bash
python3 etl/transferegov_proponentes.py --uf RJ --limite 200 --saida /tmp/beneficiarios-rj.jsonl
node scripts/import-transferegov-beneficiaries.mjs /tmp/beneficiarios-rj.jsonl
python3 etl/transferegov_propostas.py --arquivo /tmp/propostas.zip --uf RJ --ano 2025 --limite 200 --saida /tmp/objetos-rj-2025.jsonl
node scripts/import-transferegov-catalog.mjs /tmp/objetos-rj-2025.jsonl
python3 etl/transferegov_convenios.py --arquivo /tmp/convenios.zip --objetos /tmp/objetos-rj-2025.jsonl --limite 200 --saida /tmp/instrumentos-rj-2025.jsonl
node scripts/import-transferegov-catalog.mjs /tmp/instrumentos-rj-2025.jsonl
python3 etl/ibge_municipios.py --uf RJ --saida /tmp/municipios-rj.jsonl
node scripts/import-ibge-municipalities.mjs /tmp/municipios-rj.jsonl
python3 etl/ibge_populacao.py --arquivo /tmp/POP2025_20260113.ods --uf RJ --ano 2025 --saida /tmp/populacao-rj-2025.jsonl
node scripts/import-ibge-municipalities.mjs /tmp/populacao-rj-2025.jsonl
python3 etl/transferegov_emendas.py --arquivo /tmp/emendas.zip --chaves "NUMEROS_NR_EMENDA" --saida /tmp/emendas-transferegov.jsonl
node scripts/reconcile-transferegov-amendments.mjs /tmp/emendas-transferegov.jsonl 2025
```

## Qualidade e segurança

O projeto executa `pnpm check` e `pnpm test`. A suíte inclui normalização dos valores brasileiros, regra conservadora do semáforo, autenticação da chave da fonte oficial e auditoria axe de um componente de visualização com tabela equivalente. O workflow em `.github/workflows/quality.yml` executa esses controles a cada alteração.

Não coloque chaves no código, no README, em URLs, em logs ou em exportações. `PORTAL_TRANSPARENCIA_API_KEY` é usada apenas pelo servidor e deve ser criada pelo gerenciador de segredos do projeto.

## Documentação adicional

O [dicionário de dados](docs/data-dictionary.md) descreve as entidades e suas chaves. A [arquitetura](docs/architecture.md) registra os fluxos de fontes, persistência, API e cargas periódicas. A interface contém a página `/metodologia`, com glossário, regras do semáforo e limitações.

## Referências

[1]: https://api.portaldatransparencia.gov.br/ "API do Portal da Transparência — CGU"
[2]: https://www1.siop.planejamento.gov.br/siopdoc/doku.php/acesso_publico:dados_abertos "SIOP — Dados Abertos"
[3]: https://docs.api.transferegov.gestao.gov.br/transferenciasespeciais/ "API de dados abertos — Transferências Especiais do Transferegov"
[4]: https://www.gov.br/transferegov/pt-br/ferramentas-gestao/dados-abertos/download-dados "Download de Dados Transferegov.br — Módulo Discricionárias e Legais"
