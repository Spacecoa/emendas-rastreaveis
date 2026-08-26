// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    emendas: {
      sources: { useQuery: () => ({ data: [{ name: "Portal da Transparência (CGU)", status: "available", latestSuccessfulLoadAt: new Date("2026-08-26T02:15:40.000Z") }] }) },
      search: { useQuery: () => ({ data: { records: [] } }) },
      coverage: { useQuery: () => ({ isLoading: false, data: {
        referenceYear: 2025,
        totals: { amendments: 75, financialStages: 450, beneficiaries: 200, objects: 200, instruments: 114, municipalities: 92 },
        availableStates: [{ uf: "RJ", municipalityCount: 92, population: 17223547, populationReferenceYear: 2025, populationSourceUrl: "https://example.test/ibge", updatedAt: new Date("2026-08-26T02:15:40.000Z") }],
        reconciliation: { evaluated: 75, matched: 55, matchRate: 0.7333, updatedAt: new Date("2026-08-26T02:15:40.000Z") },
      } }) },
      suggestions: { useQuery: () => ({ data: { amendments: [], authors: [], beneficiaries: [], municipalities: [], objects: [] } }) },
    },
  },
}));

import Home from "../client/src/pages/Home";

describe("transparência da página inicial", () => {
  it("mostra cobertura concreta, acesso por UF e nota institucional sem violações axe", async () => {
    const { container } = render(<Home />);

    expect(screen.getByRole("heading", { name: "O que está disponível hoje." })).toBeTruthy();
    expect(screen.getByText("55/75")).toBeTruthy();
    expect(screen.getByText("RJ")).toBeTruthy();
    expect(screen.getByRole("button", { name: "A–Z" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Enquadramento jurídico")).toBeTruthy();

    const result = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations).toEqual([]);
  });
});
