// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";

const amendment = {
  code: "202539940017", year: 2025, number: "0017", author: "GENERAL GIRAO", locality: "RIO GRANDE DO NORTE (UF)", type: "Emenda Individual", budgetFunction: "Defesa nacional", budgetSubfunction: null,
  committed: 39989.35, settled: 39989.35, paid: 39989.35, remainingRegistered: null, remainingCancelled: null, remainingPaid: null,
  complianceStatus: "informacao_insuficiente" as const, source: "Portal da Transparência (CGU)" as const, sourceUrl: "https://api.portaldatransparencia.gov.br/", extractedAt: "2026-08-26T00:32:00.000Z", recordHash: "hash-oficial-teste",
};

vi.mock("@/lib/trpc", () => ({
  trpc: {
    emendas: {
      byCode: { useQuery: () => ({ isLoading: false, data: amendment }) },
      documents: { useQuery: () => ({ isFetching: false, data: { items: [] } }) },
    },
  },
}));

import AmendmentPage from "../client/src/pages/AmendmentPage";

describe("acessibilidade da página de emenda", () => {
  it("expõe situação, valores, limites e origem sem violações axe", async () => {
    window.history.replaceState({}, "", "/emendas/202539940017?ano=2025");
    const { container } = render(<AmendmentPage />);

    expect(screen.getByRole("heading", { name: "GENERAL GIRAO" })).toBeTruthy();
    expect(screen.getByText("Execução financeira conhecida")).toBeTruthy();
    expect(screen.getByText("O recurso foi pago. Isso não confirma, sozinho, a entrega final do objeto.")).toBeTruthy();
    expect(screen.getByText("Origem do registro")).toBeTruthy();
    const result = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations).toEqual([]);
  });
});
