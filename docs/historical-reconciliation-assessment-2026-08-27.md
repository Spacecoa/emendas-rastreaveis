# Avaliação de conciliação documental histórica — 2022 a 2025

**Data da avaliação:** 27 de agosto de 2026  
**Objetivo:** verificar se a carga financeira nacional de emendas de 2022, 2023, 2024 e 2025 pode ser conciliada com segurança ao arquivo oficial de Emendas Parlamentares do Transferegov.

> **Conclusão:** a conciliação documental de **2025** permanece válida. Não é seguro aplicar o arquivo atual do Transferegov aos exercícios de **2022, 2023 e 2024** somente por `NR_EMENDA`, pois a chave de oito dígitos se repete entre exercícios e o arquivo oficial atual não contém um campo de ano.

## Evidências verificadas

O arquivo oficial atual de Emendas Parlamentares foi obtido do repositório indicado pelo Transferegov, com hash SHA-256 `a68ef3c2053830a649b300bf82881c190b7f9b1d046e3441ffe873dff99cd923`. O cabeçalho publicado contém `ID_PROPOSTA`, `NR_EMENDA`, parlamentar, beneficiário, tipo e valores de repasse, mas **não contém exercício, ano de apresentação ou ano de transferência**. A página oficial descreve esse conjunto como uma extração diária, e o índice público lista somente o arquivo corrente, sem versões arquivadas por exercício. [1] [2]

| Exercício financeiro | Emendas CGU com chave final de oito dígitos |           Linhas documentais já vinculadas com segurança |
| -------------------- | ------------------------------------------: | -------------------------------------------------------: |
| 2022                 |                                       6.108 |                                                        0 |
| 2023                 |                                       6.059 |                                                        0 |
| 2024                 |                                       6.986 |                                                        0 |
| 2025                 |                                       6.311 | 61.402 linhas, correspondentes a 4.710 emendas distintas |

As chaves finais de oito dígitos não identificam um único exercício. Na própria base financeira persistida, foram encontradas as sobreposições abaixo.

| Exercícios comparados | Chaves de oito dígitos repetidas |
| --------------------- | -------------------------------: |
| 2022 e 2023           |                            4.496 |
| 2022 e 2024           |                            2.942 |
| 2022 e 2025           |                            2.758 |
| 2023 e 2024           |                            2.885 |
| 2023 e 2025           |                            2.749 |
| 2024 e 2025           |                            5.252 |

Portanto, reutilizar o arquivo atual para cada ano poderia ligar uma mesma linha do Transferegov a emendas financeiras de anos diferentes. Esse resultado seria **aparentemente preciso, mas documentalmente incorreto**. O projeto não executou essa associação e não alterou valores, filtros por UF, nem estados de entrega física.

## Cobertura que permanece válida

Para 2025, a regra adotada continua sendo igualdade exata entre a chave final de oito dígitos da emenda CGU e `NR_EMENDA`, no mesmo exercício de referência da carga já processada. Foram preservadas 61.402 linhas, vinculadas a 4.710 das 6.311 emendas CGU/2025 (74,63%). As 1.601 chaves restantes permanecem explicitamente não conciliadas. Essa ligação não prova entrega física, regularidade ou irregularidade.

## O que é necessário para conciliar 2022–2024 corretamente

É necessária uma fonte oficial que acrescente uma dimensão temporal ou uma relação documental única, por exemplo uma exportação ou API que traga simultaneamente o exercício da emenda e `NR_EMENDA`, ou uma tabela oficial de proposta com chave que relacione de forma verificável a proposta ao exercício financeiro. A fonte deve permitir registrar URL, data de extração, membro processado, hash e critério de igualdade antes de qualquer carga.

Enquanto essa fonte não for disponibilizada, a plataforma continuará a apresentar **dados financeiros de 2022 a 2025** e a declarar com clareza que a **conciliação documental disponível é restrita a 2025**. Ausência de conciliação não será exibida como zero, falha, atraso ou ausência de entrega.

## Referências

[1]: https://www.gov.br/transferegov/pt-br/ferramentas-gestao/dados-abertos/download-dados "Download de Dados Transferegov.br — Módulo Discricionárias e Legais"
[2]: https://repositorio.dados.gov.br/seges/detru/ "Índice público do repositório de dados do Transferegov"
