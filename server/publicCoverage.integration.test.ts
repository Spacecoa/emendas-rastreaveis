import { describe, expect, it } from "vitest";
import { getPublicCoverageSummary } from "./emendas";

describe("síntese pública de cobertura", () => {
  it("expõe somente totais persistidos, a UF disponível e a taxa de conciliação documentada", async () => {
    const coverage = await getPublicCoverageSummary();
    const minasGerais = coverage?.availableStates.find(
      state => state.uf === "MG"
    );
    const rioDeJaneiro = coverage?.availableStates.find(
      state => state.uf === "RJ"
    );

    expect(coverage).toMatchObject({
      referenceYear: 2025,
      financialSeries: [
        {
          year: 2022,
          amendments: 6108,
          financialStages: 36648,
          municipalizedAmendments: 1458,
          committedAmount: 25458155910.19,
          settledAmount: 17230607388.21,
          paidAmount: 17032527467.49,
        },
        {
          year: 2023,
          amendments: 6059,
          financialStages: 36354,
          municipalizedAmendments: 1401,
          committedAmount: 35247659122.58,
          settledAmount: 21937884356.29,
          paidAmount: 21794682215.75,
        },
        {
          year: 2024,
          amendments: 6986,
          financialStages: 41916,
          municipalizedAmendments: 1168,
          committedAmount: 44780175550.47,
          settledAmount: 31480063935.01,
          paidAmount: 31366486593.43,
        },
        {
          year: 2025,
          amendments: 6311,
          financialStages: 37866,
          municipalizedAmendments: 759,
          committedAmount: 50905200171.13,
          settledAmount: 32819782336.69,
          paidAmount: 32479836877.66,
        },
      ],
      totals: {
        amendments: 6311,
        financialStages: 37866,
        beneficiaries: 5400,
        objects: 5400,
        instruments: 1812,
        municipalities: 5571,
      },
      reconciliation: { evaluated: 6311, matched: 4710, matchRate: 0.7463 },
    });
    expect(coverage?.availableStates).toHaveLength(27);
    expect(coverage?.availableStates.map(state => state.uf)).toEqual(
      expect.arrayContaining(["AC", "DF", "MG", "RJ", "SP", "TO"])
    );
    expect(minasGerais).toMatchObject({
      municipalityCount: 853,
      population: 21393441,
      populationReferenceYear: 2025,
    });
    expect(minasGerais?.populationSourceUrl).toContain("POP2025_20260113.ods");
    expect(rioDeJaneiro).toMatchObject({
      municipalityCount: 92,
      population: 17223547,
      populationReferenceYear: 2025,
    });
    expect(rioDeJaneiro?.populationSourceUrl).toContain("POP2025_20260113.ods");
    expect(minasGerais?.catalog).toMatchObject({
      beneficiaries: 200,
      objects: 200,
      instruments: 45,
      reconciledObjects: 30,
      reconciledInstruments: 29,
    });
    expect(
      coverage?.sources.some(
        source => source.name === "Portal da Transparência (CGU)"
      )
    ).toBe(true);
    expect(
      coverage?.sources.some(
        source => source.name === "Transferegov — Propostas"
      )
    ).toBe(true);
  });

  it("recalcula a série anual por autoria persistida e não inventa filiação partidária ausente", async () => {
    const coverage = await getPublicCoverageSummary({ authorId: 30053 });

    expect(coverage?.filters).toMatchObject({
      activeAuthor: {
        id: 30053,
        name: "JANDIRA FEGHALI",
        authorType: "parlamentar",
        party: null,
        amendments: 95,
      },
      activeParty: null,
      party: { available: false, options: [] },
    });
    expect(coverage?.financialSeries).toMatchObject([
      {
        year: 2022,
        amendments: 23,
        financialStages: 138,
        committedAmount: 17882491.66,
        settledAmount: 12234880,
        paidAmount: 9923398,
      },
      {
        year: 2023,
        amendments: 23,
        financialStages: 138,
        committedAmount: 32102797.74,
        settledAmount: 23114879.88,
        paidAmount: 20214569.93,
      },
      {
        year: 2024,
        amendments: 25,
        financialStages: 150,
        committedAmount: 37508275.82,
        settledAmount: 9487932.99,
        paidAmount: 9041998.2,
      },
      {
        year: 2025,
        amendments: 24,
        financialStages: 144,
        committedAmount: 37475218.06,
        settledAmount: 13330417.01,
        paidAmount: 11797077.4,
      },
    ]);
    expect(coverage?.totals.amendments).toBe(6311);
  });
});
