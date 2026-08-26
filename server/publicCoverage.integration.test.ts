import { describe, expect, it } from "vitest";
import { getPublicCoverageSummary } from "./emendas";

describe("síntese pública de cobertura", () => {
  it("expõe somente totais persistidos, a UF disponível e a taxa de conciliação documentada", async () => {
    const coverage = await getPublicCoverageSummary();
    const minasGerais = coverage?.availableStates.find(state => state.uf === "MG");
    const rioDeJaneiro = coverage?.availableStates.find(state => state.uf === "RJ");

    expect(coverage).toMatchObject({
      referenceYear: 2025,
      totals: {
        amendments: 150,
        financialStages: 900,
        beneficiaries: 5400,
        objects: 5400,
        instruments: 1812,
        municipalities: 5571,
      },
      reconciliation: { evaluated: 150, matched: 112, matchRate: 0.7467 },
    });
    expect(coverage?.availableStates).toHaveLength(27);
    expect(coverage?.availableStates.map(state => state.uf)).toEqual(expect.arrayContaining([
      "AC", "DF", "MG", "RJ", "SP", "TO",
    ]));
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
      reconciledObjects: 0,
      reconciledInstruments: 0,
    });
    expect(coverage?.sources.some(source => source.name === "Portal da Transparência (CGU)")).toBe(true);
    expect(coverage?.sources.some(source => source.name === "Transferegov — Propostas")).toBe(true);
  });
});
