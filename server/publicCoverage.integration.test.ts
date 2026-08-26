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
        amendments: 75,
        financialStages: 450,
        beneficiaries: 400,
        objects: 400,
        instruments: 159,
        municipalities: 945,
      },
      reconciliation: { evaluated: 75, matched: 55, matchRate: 0.7333 },
    });
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
  });
});
