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
            totals: {
              amendments: 150,
              financialStages: 900,
              beneficiaries: 5400,
              objects: 5400,
              instruments: 1812,
              municipalities: 5571,
            },
            reconciliation: {
              evaluated: 150,
              matched: 112,
              matchRate: 0.7467,
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
                coverageNote: "Amostra oficial persistida.",
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
      screen.getByRole("heading", { name: /O que está carregado/i })
    ).toBeTruthy();
    expect(screen.getByText("112/150")).toBeTruthy();
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
  });
});
