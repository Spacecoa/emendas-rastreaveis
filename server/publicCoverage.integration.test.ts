import { describe, expect, it } from "vitest";
import { getPublicCoverageSummary } from "./emendas";

describe("síntese pública de cobertura", () => {
  it("expõe somente totais persistidos, a UF disponível e a taxa de conciliação documentada", async () => {
    const coverage = await getPublicCoverageSummary();
    const rioDeJaneiro = coverage?.availableStates.find(state => state.uf === "RJ");

    expect(coverage).toMatchObject({
      referenceYear: 2025,
      totals: {
        amendments: 75,
        financialStages: 450,
        beneficiaries: 200,
        objects: 200,
        instruments: 114,
        municipalities: 92,
      },
      reconciliation: { evaluated: 75, matched: 55, matchRate: 0.7333 },
    });
    expect(rioDeJaneiro).toMatchObject({
      municipalityCount: 92,
      population: 17223547,
      populationReferenceYear: 2025,
    });
    expect(rioDeJaneiro?.populationSourceUrl).toContain("POP2025_20260113.ods");
  });
});
