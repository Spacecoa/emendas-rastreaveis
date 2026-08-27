// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    emendas: {
      coverage: {
        useQuery: () => ({
          isLoading: false,
          data: {
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
                updatedAt: new Date("2026-08-26T17:25:02.000Z"),
              },
              {
                year: 2023,
                amendments: 6059,
                financialStages: 36354,
                municipalizedAmendments: 1401,
                committedAmount: 35247659122.58,
                settledAmount: 21937884356.29,
                paidAmount: 21794682215.75,
                updatedAt: new Date("2026-08-26T17:25:02.000Z"),
              },
              {
                year: 2024,
                amendments: 6986,
                financialStages: 41916,
                municipalizedAmendments: 1168,
                committedAmount: 44780175550.47,
                settledAmount: 31480063935.01,
                paidAmount: 31366486593.43,
                updatedAt: new Date("2026-08-26T17:25:02.000Z"),
              },
              {
                year: 2025,
                amendments: 6311,
                financialStages: 37866,
                municipalizedAmendments: 759,
                committedAmount: 50905200171.13,
                settledAmount: 32819782336.69,
                paidAmount: 32479836877.66,
                updatedAt: new Date("2026-08-26T17:25:02.000Z"),
              },
            ],
            filters: {
              activeAuthor: null,
              activeParty: null,
              authorOptions: [
                {
                  id: 30053,
                  name: "JANDIRA FEGHALI",
                  authorType: "parlamentar",
                  party: null,
                  amendments: 95,
                },
              ],
              party: { available: false, options: [] },
            },
            totals: {
              amendments: 6311,
              financialStages: 37866,
              beneficiaries: 5400,
              objects: 5400,
              instruments: 1812,
              municipalities: 5571,
            },
            reconciliation: {
              evaluated: 6311,
              matched: 4710,
              matchRate: 0.7463,
              updatedAt: new Date("2026-08-26T04:25:00.000Z"),
            },
            availableStates: [
              {
                uf: "AL",
                municipalityCount: 102,
                population: 3120000,
                populationReferenceYear: 2025,
                populationSourceUrl: "https://example.test/ibge-al",
                updatedAt: new Date("2026-08-26T04:25:00.000Z"),
                catalog: {
                  beneficiaries: 200,
                  objects: 200,
                  instruments: 50,
                  reconciledObjects: 1,
                  reconciledInstruments: 1,
                  catalogUpdatedAt: new Date("2026-08-26T04:25:00.000Z"),
                  provenance: [
                    {
                      kind: "objeto",
                      sourceUrl: "https://example.test/propostas-al",
                      hashes: 200,
                    },
                  ],
                },
              },
              {
                uf: "MG",
                municipalityCount: 853,
                population: 21393441,
                populationReferenceYear: 2025,
                populationSourceUrl: "https://example.test/ibge-mg",
                updatedAt: new Date("2026-08-26T04:25:00.000Z"),
                catalog: {
                  beneficiaries: 200,
                  objects: 200,
                  instruments: 45,
                  reconciledObjects: 0,
                  reconciledInstruments: 0,
                  catalogUpdatedAt: new Date("2026-08-26T04:25:00.000Z"),
                  provenance: [
                    {
                      kind: "instrumento",
                      sourceUrl: "https://example.test/instrumentos-mg",
                      hashes: 45,
                    },
                  ],
                },
              },
            ],
            sources: [
              {
                name: "Portal da Transparência (CGU)",
                baseUrl: "https://example.test/cgu",
                status: "available",
                latestSuccessfulLoadAt: new Date("2026-08-26T04:25:00.000Z"),
                coverageNote: "Carga financeira nacional oficial de 2025.",
              },
            ],
          },
        }),
      },
    },
  },
}));

import CoveragePage from "../client/src/pages/CoveragePage";

describe("aba pública de cobertura", () => {
  it("expõe rastreabilidade por UF, fontes e limites sem violações axe", async () => {
    const { container } = render(<CoveragePage />);

    expect(
      screen.getByRole("heading", { name: /O que já sabemos/i })
    ).toBeTruthy();
    expect(screen.getByText("4.710/6.311")).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        name: /Emendas CGU carregadas de 2022 a 2025/i,
      })
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        name: /O que o dinheiro mostra em cada ano/i,
      })
    ).toBeTruthy();
    expect(screen.getByLabelText("Autor ou autora")).toBeTruthy();
    expect(
      screen.getByText(/1\. Escolha como detalhar o recorte/i)
    ).toBeTruthy();
    expect(
      screen.getByText(/1 autorias disponíveis na carga selecionada/i)
    ).toBeTruthy();
    expect(
      screen.getByRole("option", {
        name: /JANDIRA FEGHALI · parlamentar · 95 emendas/i,
      })
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Partido político").hasAttribute("disabled")
    ).toBe(true);
    expect(
      screen.getByText(/não traz partido preenchido para as autorias/i)
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /CSV/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /PDF/i })).toBeTruthy();
    expect(
      screen.getByLabelText("Exportar resumo financeiro filtrado")
    ).toBeTruthy();
    expect(screen.getAllByText(/Total empenhado/).length).toBe(4);
    expect(
      screen.getByRole("img", {
        name: /O empenho de 2025 equivale a 100%/i,
      })
    ).toBeTruthy();
    expect(
      screen.getAllByText(/Pagamento não comprova entrega/i).length
    ).toBeGreaterThan(0);
    expect(
      screen
        .getAllByRole("link", {
          name: /Consultar emendas do exercício 2022/i,
        })
        .every(link => link.getAttribute("href") === "/busca?ano=2022")
    ).toBe(true);
    expect(
      screen.getByRole("heading", {
        name: /Expandir a cobertura sem pular etapas de verificação/i,
      })
    ).toBeTruthy();
    expect(
      screen.getByText(/Esta é uma recomendação de implementação/i)
    ).toBeTruthy();
    expect(screen.getByText("ETAPA 01")).toBeTruthy();
    expect(screen.getByText("ETAPA 05")).toBeTruthy();
    expect(
      screen.getAllByRole("link", { name: /IBGE/i }).length
    ).toBeGreaterThanOrEqual(2);
    expect(
      screen
        .getAllByRole("link", {
          name: /Consultar emendas com vínculo territorial em AL/i,
        })
        .every(link => link.getAttribute("href") === "/busca?ano=2025&uf=AL")
    ).toBe(true);
    expect(
      screen.getByRole("button", { name: "A–Z" }).getAttribute("aria-pressed")
    ).toBe("true");

    const desktopTable = screen.getByRole("table", {
      name: "Cobertura territorial e rastreabilidade por UF",
    });
    const alRow = within(desktopTable).getByRole("row", { name: /AL/ });
    expect(within(alRow).getByText("102 municípios")).toBeTruthy();
    expect(
      within(alRow).getByText(/3\.120\.000 habitantes · 2025/)
    ).toBeTruthy();
    expect(
      within(alRow).getByText(/200 objetos · 50 instrumentos/)
    ).toBeTruthy();
    expect(within(alRow).getByText("2 vínculos")).toBeTruthy();
    expect(
      within(alRow).getByRole("link", { name: /IBGE/i }).getAttribute("href")
    ).toBe("https://example.test/ibge-al");
    expect(
      within(alRow)
        .getByRole("link", {
          name: /Consultar emendas com vínculo territorial em AL/i,
        })
        .getAttribute("href")
    ).toBe("/busca?ano=2025&uf=AL");

    const mobileCards = screen.getByRole("list", {
      name: "Cobertura territorial por UF",
    });
    const alCard = within(mobileCards).getByText("AL").closest("li")!;
    expect(within(alCard).getByText(/102 municípios/i)).toBeTruthy();
    expect(within(alCard).getByText(/população 2025/i)).toBeTruthy();
    expect(within(alCard).getByText(/200 objetos/i)).toBeTruthy();
    expect(within(alCard).getByText(/50 instrumentos/i)).toBeTruthy();
    expect(within(alCard).getByText(/2 vínculos/i)).toBeTruthy();
    expect(
      within(alCard).getByRole("link", { name: /IBGE/i }).getAttribute("href")
    ).toBe("https://example.test/ibge-al");
    expect(
      within(alCard)
        .getByRole("link", {
          name: /Consultar emendas com vínculo territorial em AL/i,
        })
        .getAttribute("href")
    ).toBe("/busca?ano=2025&uf=AL");

    fireEvent.click(screen.getByRole("button", { name: "Catálogo" }));
    expect(
      screen
        .getByRole("button", { name: "Catálogo" })
        .getAttribute("aria-pressed")
    ).toBe("true");

    const result = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  }, 180_000);
});
