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
        },
        {
          year: 2023,
          amendments: 6059,
          financialStages: 36354,
          municipalizedAmendments: 1401,
        },
        {
          year: 2024,
          amendments: 6986,
          financialStages: 41916,
          municipalizedAmendments: 1168,
        },
        {
          year: 2025,
          amendments: 6311,
          financialStages: 37866,
          municipalizedAmendments: 759,
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
});
