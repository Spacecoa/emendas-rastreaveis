import { describe, expect, it } from "vitest";
import {
  createCguHeaderIndex,
  parseSemicolonCsvLine,
  toCguNationalAmendment,
} from "./cguNationalCsv";

describe("normalização do arquivo nacional de emendas CGU", () => {
  it("preserva valores, chave municipal e origem do CSV oficial", () => {
    const headers = parseSemicolonCsvLine(
      '"Código da Emenda";"Ano da Emenda";"Tipo de Emenda";"Código do Autor da Emenda";"Nome do Autor da Emenda";"Número da emenda";"Localidade de aplicação do recurso";"Código Município IBGE";"Nome Função";"Nome Subfunção";"Valor Empenhado";"Valor Liquidado";"Valor Pago";"Valor Restos A Pagar Inscritos";"Valor Restos A Pagar Cancelados";"Valor Restos A Pagar Pagos"'
    );
    const values = parseSemicolonCsvLine(
      '"202500000001";"2025";"Emenda Individual";"123";"AUTORA TESTE";"0001";"CIDADE; UF";"1100015";"Saúde";"Atenção básica";"1.000,50";"900,00";"800,00";"20,00";"5,00";"10,00"'
    );

    const record = toCguNationalAmendment(
      createCguHeaderIndex(headers),
      values,
      "https://example.test/EmendasParlamentares.zip",
      "2026-08-26T00:00:00.000Z"
    );

    expect(record).toMatchObject({
      code: "202500000001",
      year: 2025,
      author: "AUTORA TESTE",
      authorCode: "123",
      locality: "CIDADE; UF",
      municipalityIbgeCode: "1100015",
      committed: 1000.5,
      settled: 900,
      paid: 800,
      remainingRegistered: 20,
      remainingCancelled: 5,
      remainingPaid: 10,
      source: "Portal da Transparência (CGU)",
    });
  });
});
