// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    emendas: {
      sources: {
        useQuery: () => ({
          data: [
            {
              name: "Portal da Transparência (CGU)",
              status: "available",
              latestSuccessfulLoadAt: new Date("2026-08-26T02:15:40.000Z"),
            },
          ],
        }),
      },
      search: { useQuery: () => ({ data: { records: [] } }) },
      coverage: {
        useQuery: () => ({
          isLoading: false,
          data: {
            referenceYear: 2025,
            totals: {
              amendments: 6311,
              financialStages: 37866,
              beneficiaries: 5400,
              objects: 5400,
              instruments: 1812,
              municipalities: 5571,
            },
            availableStates: [
              {
                uf: "RJ",
                municipalityCount: 92,
                population: 17223547,
                populationReferenceYear: 2025,
                populationSourceUrl: "https://example.test/ibge",
                updatedAt: new Date("2026-08-26T02:15:40.000Z"),
              },
            ],
            reconciliation: {
              evaluated: 6311,
              matched: 4710,
              matchRate: 0.7463,
              updatedAt: new Date("2026-08-26T02:15:40.000Z"),
            },
          },
        }),
      },
      suggestions: {
        useQuery: () => ({
          data: {
            amendments: [],
            authors: [],
            beneficiaries: [],
            municipalities: [],
            objects: [],
          },
        }),
      },
    },
  },
}));

import Home from "../client/src/pages/Home";

describe("transparência da página inicial", () => {
  it("mostra cobertura concreta, acesso por UF e nota institucional sem violações axe", async () => {
    const { container } = render(<Home />);

    expect(
      screen.getByRole("heading", { name: "O que está disponível hoje." })
    ).toBeTruthy();
    expect(screen.getByText("6.311")).toBeTruthy();
    expect(screen.getByText("4710/6311")).toBeTruthy();
    expect(screen.getByText("RJ")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "A–Z" }).getAttribute("aria-pressed")
    ).toBe("true");
    expect(screen.getByText("Enquadramento jurídico")).toBeTruthy();
    expect(
      screen.getByText(/Fonte financeira: Portal da Transparência/)
    ).toBeTruthy();
    expect(screen.queryByText("aguardando primeira carga")).toBeNull();

    const result = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });
});
