// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    emendas: {
      search: {
        useQuery: () => ({
          isLoading: false,
          data: {
            records: [
              {
                code: "202539940017",
                year: 2025,
                number: "0017",
                author: "GENERAL GIRAO",
                locality: "RIO GRANDE DO NORTE (UF)",
                complianceStatus: "informacao_insuficiente",
              },
            ],
          },
        }),
      },
      municipalityPerCapita: {
        useQuery: (input: { municipality: string }) => ({
          data:
            input.municipality === "Abre Campo"
              ? {
                  status: "eligible",
                  linkedAmendments: 1,
                  paid: 2500000,
                  population: 14354,
                  populationReferenceYear: 2025,
                  perCapitaPaid: 2500000 / 14354,
                  financialSourceUrl: "https://example.test/cgu",
                  populationSourceUrl: "https://example.test/ibge",
                }
              : null,
          isLoading: false,
        }),
      },
      municipalityAmendments: {
        useQuery: (input: { municipality: string }) => ({
          data:
            input.municipality === "Abre Campo"
              ? [
                  {
                    code: "202529240019",
                    year: 2025,
                    number: "0019",
                    locality: "ABRE CAMPO - MG",
                    budgetFunction: "Saúde",
                    committed: 5000000,
                    settled: 2500000,
                    paid: 2500000,
                    complianceStatus: "em_execucao",
                    source: "Portal da Transparência (CGU)",
                    sourceUrl: "https://example.test/cgu",
                    extractedAt: "2026-08-26T05:42:39.000Z",
                  },
                ]
              : [],
          isLoading: false,
        }),
      },
    },
  },
}));

import EntityPage from "../client/src/pages/EntityPage";

afterEach(cleanup);

describe("precisão da página de entidade", () => {
  it("não mostra registros de fallback quando o município da URL não corresponde ao resultado", async () => {
    window.history.replaceState(
      {},
      "",
      "/municipios/Municipio%20Inexistente?ano=2025"
    );
    const { container } = render(<EntityPage type="municipio" />);

    expect(
      screen.getByRole("heading", {
        name: "Não encontramos resultados para esta busca.",
      })
    ).toBeTruthy();
    expect(screen.queryByText("Emenda 0017")).toBeNull();
    const result = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });

  it("mantém o card de resultado semanticamente válido quando o parlamentar corresponde", async () => {
    window.history.replaceState(
      {},
      "",
      "/parlamentares/GENERAL%20GIRAO?ano=2025"
    );
    const { container } = render(<EntityPage type="parlamentar" />);

    expect(screen.getByText("Emenda 0017")).toBeTruthy();
    expect(container.querySelector("a a")).toBeNull();
    const result = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });

  it("expõe o pagamento por habitante elegível com fontes separadas e sem atribuir entrega física", async () => {
    window.history.replaceState({}, "", "/municipios/Abre%20Campo?ano=2025");
    const { container } = render(<EntityPage type="municipio" />);

    expect(screen.getByText("Dinheiro pago por morador")).toBeTruthy();
    expect(screen.getByText(/R\$\s*174,17/)).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        name: "Dinheiro pago por morador neste município",
      })
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Fonte financeira CGU" })
        .getAttribute("href")
    ).toBe("https://example.test/cgu");
    expect(
      screen
        .getByRole("link", { name: "População IBGE/2025" })
        .getAttribute("href")
    ).toBe("https://example.test/ibge");
    expect(
      screen.getByText(/Pagamento não comprova entrega física/)
    ).toBeTruthy();
    const result = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });
});
