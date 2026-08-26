import { describe, expect, it } from "vitest";
import { complianceFromOfficialFields, parseBrazilianAmount } from "./portalTransparency";

describe("normalização do Portal da Transparência", () => {
  it("converte valores brasileiros sem confundir ausência com zero", () => {
    expect(parseBrazilianAmount("1.234.567,89")).toBe(1234567.89);
    expect(parseBrazilianAmount("0,00")).toBe(0);
    expect(parseBrazilianAmount("- 26002.00")).toBe(-26002);
    expect(parseBrazilianAmount(undefined)).toBeNull();
    expect(parseBrazilianAmount("")).toBeNull();
  });

  it("usa informação insuficiente quando só há dado financeiro ou transferência especial", () => {
    expect(complianceFromOfficialFields({ type: "Emenda Individual - Transferências Especiais", committed: 500, paid: 500 })).toBe("informacao_insuficiente");
    expect(complianceFromOfficialFields({ type: "Emenda Individual", committed: 500, paid: 500 })).toBe("informacao_insuficiente");
  });

  it("indica execução em curso quando o pagamento conhecido é menor que o empenho", () => {
    expect(complianceFromOfficialFields({ type: "Emenda de Bancada", committed: 800, paid: 300 })).toBe("em_execucao");
  });

  it("só libera os demais estados quando uma fonte oficial adicional apresenta evidência aplicável", () => {
    const financial = { type: "Emenda Individual", committed: 800, paid: 800 };
    expect(complianceFromOfficialFields(financial, { hasPhysicalEvidence: true })).toBe("executada_comprovada");
    expect(complianceFromOfficialFields(financial, { hasPendingAccountability: true })).toBe("pendencia");
    expect(complianceFromOfficialFields(financial, { hasExpiredWithoutDelivery: true })).toBe("nao_cumprida");
  });
});
