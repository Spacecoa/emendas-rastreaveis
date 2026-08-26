# Emendas em Foco

**Emendas em Foco** é uma plataforma pública para acompanhar emendas parlamentares brasileiras sem confundir o pagamento com a entrega do objeto. A interface apresenta a execução financeira e reserva a comprovação física para quando houver fonte oficial suficiente.

> **Princípio central:** nenhum dado ausente é convertido em zero, estimativa ou acusação. Toda informação exibida deve carregar origem, URL oficial, data de extração e hash do registro.

## O que esta primeira versão entrega

| Área                    | Implementação atual                                                                                    | Limite informado ao usuário                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Busca pública           | Busca por autoria, localidade, código, número, função e subfunção em consulta oficial                  | Retorna uma página por vez até a expansão da carga persistida; cobertura por UF só é declarada quando a fonte oferece chave territorial documentada |
| Execução financeira     | Empenho, liquidação, pagamento e restos a pagar da API CGU                                             | Dotação e autorizado aguardam integração SIOP                                                                                                       |
| Página da emenda        | Linha do tempo, valores, situação, documento e link da fonte                                           | A entrega física não é inferida da execução financeira                                                                                              |
| Município e parlamentar | Resumo do recorte, lista de emendas, escada financeira e pagamento por habitante quando elegível       | O indicador só usa emendas com código IBGE, pagamentos publicados e população IBGE do mesmo exercício; não comprova entrega física                  |
| Exportação              | CSV, JSON e XLSX do recorte visível                                                                    | Reflete os registros retornados pela consulta atual                                                                                                 |
| Transparência técnica   | OpenAPI em `/api/v1/openapi.json`; REST em `/api/v1/emendas` e `/api/v1/sugestoes`                     | A carga financeira CGU é nacional; cobertura por UF exige código IBGE ou vínculo documental territorial                                             |
| Acessibilidade          | HTML semântico, skip link, foco visível, teclado, tabela equivalente, redução de movimento e teste axe | A auditoria deve seguir sendo ampliada por página                                                                                                   |

## Dados oficiais e licenças

O Portal da Transparência da CGU documenta a consulta pontual de emendas e documentos relacionados [1], mas a rota não oferece filtro por UF. A carga financeira de 2025 usa, por isso, o arquivo único oficial de dados abertos em escopo nacional. A cobertura por UF continua condicionada a código municipal IBGE ou vínculo documental territorial verificável. A conciliação usa o arquivo oficial de emendas do Transferegov: **4.710 das 6.311 emendas CGU/2025** correspondem exatamente a `NR_EMENDA` (74,63%), com 61.402 linhas oficiais de proposta preservadas. Objetos e instrumentos só recebem vínculo após essa chave; o vínculo é documental e **não prova entrega física**. Os termos de uso e a licença de cada conjunto são preservados; a aplicação não reatribui licença aos dados públicos.

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

Beneficiários, objetos e instrumentos são guardados com URL, data e hash. A conciliação nacional compara os oito últimos dígitos do código CGU com `NR_EMENDA`, preserva cada linha de proposta pelo respectivo hash e só vincula catálogo quando a proposta tem chave exata não ambígua. Registros sem essa chave permanecem não conciliados, e nenhum vínculo é apresentado como evidência de entrega física.

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
node scripts/export-cgu-amendment-keys.mjs /tmp/chaves-cgu-2025.txt 2025
python3 etl/transferegov_emendas.py --arquivo /tmp/emendas.zip --chaves-arquivo /tmp/chaves-cgu-2025.txt --saida /tmp/emendas-transferegov.jsonl
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
