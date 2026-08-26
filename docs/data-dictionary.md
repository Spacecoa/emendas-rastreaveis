# Dicionário de dados

Cada registro de domínio preserva **fonte**, **URL de origem**, **data de extração** e **hash do registro**. Campos que não aparecem na fonte são armazenados como `NULL`, e não como zero.

| Entidade | Finalidade | Chave de conciliação / relação | Proveniência obrigatória |
| --- | --- | --- | --- |
| `authors` | Parlamentar, bancada, comissão ou relator | Código estável quando a fonte o publicar; nome normalizado na carga inicial | Fonte, URL, data e hash |
| `amendments` | Registro orçamentário da emenda | Código da emenda + ano | Fonte, URL, data e hash |
| `budget_programs` | Programação e autorizado | Emenda + órgão + ação | Fonte, URL, data e hash |
| `execution_stages` | Empenho, liquidação, pagamento e restos a pagar | Emenda + estágio + documento quando disponível | Fonte, URL, data e hash |
| `beneficiaries` | Ente ou entidade recebedora | CNPJ; vínculo municipal quando houver | Fonte, URL, data e hash |
| `instruments` | Convênio, repasse, fundo a fundo ou transferência especial | Número do instrumento + beneficiário | Fonte, URL, data e hash |
| `amendment_objects` | Objeto oficial e tradução em linguagem simples | Emenda + instrumento | Fonte, URL, data e hash |
| `physical_milestones` | Execução física ou finalística | Instrumento + marco | Fonte, URL, data e hash |
| `accountabilities` | Situação da prestação de contas | Instrumento | Fonte, URL, data e hash |
| `municipalities` | Código IBGE, UF, população e geografia | Código IBGE | Fonte, URL, data e hash |
| `compliance_alerts` | Fatos que podem disparar aviso | Emenda + tipo de alteração | Fonte, URL, data e hash |
| `ingestion_runs` | Auditoria de cada carga | Fonte + início da execução | Ano, UF, registros extraídos, registros conciliados e taxa de casamento |

## Taxa de casamento

A taxa de casamento é calculada como `registros conciliados / registros extraídos`. A conciliação planejada usa **código da emenda + ano + órgão + CNPJ do beneficiário**. Na primeira carga do Portal da Transparência, antes da integração de uma segunda base, o valor é **0,0000** e não representa falha nem cobertura nacional: significa somente que ainda não havia outra fonte integrada para conciliar.
