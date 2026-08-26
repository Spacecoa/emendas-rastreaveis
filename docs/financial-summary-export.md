# Exportação do resumo financeiro filtrado

O painel anual em `/cobertura` exporta exatamente a série financeira presente no recorte visual atual. A autoria é selecionada por identificador persistido; o partido só é exportado quando está preenchido na fonte oficial carregada. No recorte de 2022–2025 atualmente persistido, o campo de partido permanece como `informacao_indisponivel` e não recebe inferência externa.

| Campo | CSV | PDF | Regra |
| --- | --- | --- | --- |
| Exercício, emendas e estágios financeiros | Sim | Sim | Uma linha por exercício presente no painel. |
| Empenhado, liquidado e pago | Sim | Sim | Etapas financeiras distintas; nunca são somadas. |
| Identificador e nome da autoria | Sim | Sim | Preenchidos apenas quando existe recorte por autoria. |
| Partido | Sim | Sim | Exibido somente se persistido; caso contrário, indisponível. |
| Fonte, URL, data de geração e limite de interpretação | Sim | Sim | Incluídos em todos os arquivos para permitir auditoria do recorte. |

> Pagamento não comprova entrega física. A conciliação documental publicada continua restrita ao exercício de 2025.
