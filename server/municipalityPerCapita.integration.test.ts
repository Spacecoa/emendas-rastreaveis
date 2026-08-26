import { describe, expect, it } from "vitest";
import {
  getMunicipalityPerCapitaSummary,
  getStoredMunicipalityAmendments,
} from "./emendas";

describe("indicador municipal de pagamento por habitante", () => {
  it("calcula somente quando população IBGE e pagamentos oficiais cobrem todas as emendas municipalizadas", async () => {
    const summary = await getMunicipalityPerCapitaSummary({
      municipality: "Abre Campo",
      year: 2025,
    });

    expect(summary).toMatchObject({
      status: "eligible",
      municipality: { name: "Abre Campo", uf: "MG", ibgeCode: "3100302" },
      linkedAmendments: 1,
      paymentsWithValue: 1,
      paid: 2500000,
      population: 14354,
      populationReferenceYear: 2025,
    });
    expect(summary?.perCapitaPaid).toBeCloseTo(2500000 / 14354, 10);
    expect(summary?.financialSourceUrl).toContain("EmendasParlamentares.zip");
    expect(summary?.populationSourceUrl).toContain("POP2025_20260113.ods");
  });

  it("mantém o indicador indisponível quando não existe emenda municipalizada", async () => {
    const summary = await getMunicipalityPerCapitaSummary({
      municipality: "Abadia de Goiás",
      year: 2025,
    });

    expect(summary).toMatchObject({
      status: "no_linked_amendments",
      municipality: { name: "Abadia de Goiás", uf: "GO", ibgeCode: "5200050" },
      linkedAmendments: 0,
      perCapitaPaid: null,
    });
  });

  it("consulta as emendas da página municipal pelo código IBGE, sem depender de texto aproximado", async () => {
    const records = await getStoredMunicipalityAmendments({
      municipality: "Abre Campo",
      year: 2025,
    });

    expect(records).toEqual([
      expect.objectContaining({
        code: "202529240019",
        locality: "ABRE CAMPO - MG",
        sourceUrl:
          "https://dadosabertos-download.cgu.gov.br/PortalDaTransparencia/saida/emendas-parlamentares/EmendasParlamentares.zip",
      }),
    ]);
  });
});
