import { describe, expect, it } from "vitest";
import {
  buildFinancialSummaryCsv,
  buildFinancialSummaryPdf,
} from "../client/src/lib/financialSummaryExport";

const input = {
  rows: [
    {
      year: 2022,
      amendments: 23,
      financialStages: 138,
      committedAmount: 17882491.66,
      settledAmount: 12234880,
      paidAmount: 9923398,
    },
  ],
  author: { id: 30053, name: "JANDIRA FEGHALI" },
  party: null,
  partyAvailable: false,
  sourceName: "Portal da Transparência (CGU)",
  sourceUrl: "https://example.test/cgu",
  generatedAt: new Date("2026-08-26T20:00:00.000Z"),
};

describe("exportação do resumo financeiro", () => {
  it("cria CSV auditável com recorte, valores, fonte e indisponibilidade de partido", () => {
    const csv = buildFinancialSummaryCsv(input);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("recorte_autoria_id");
    expect(csv).toContain("JANDIRA FEGHALI");
    expect(csv).toContain("17882491.66");
    expect(csv).toContain("informacao_indisponivel");
    expect(csv).toContain("Portal da Transparência (CGU)");
    expect(csv).toContain("https://example.test/cgu");
    expect(csv).toContain("Pagamento não comprova entrega física");
  });

  it("cria PDF para o mesmo recorte financeiro", async () => {
    const pdf = await buildFinancialSummaryPdf(input);

    expect(pdf.type).toBe("application/pdf");
    expect(pdf.size).toBeGreaterThan(500);
  });
});
