// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    emendas: {
      search: { useQuery: () => ({ isLoading: false, data: { records: [{ code: "202539940017", year: 2025, number: "0017", author: "GENERAL GIRAO", locality: "RIO GRANDE DO NORTE (UF)", complianceStatus: "informacao_insuficiente" }] } }) },
    },
  },
}));

import EntityPage from "../client/src/pages/EntityPage";

afterEach(cleanup);

describe("precisão da página de entidade", () => {
  it("não mostra registros de fallback quando o município da URL não corresponde ao resultado", async () => {
    window.history.replaceState({}, "", "/municipios/Municipio%20Inexistente?ano=2025");
    const { container } = render(<EntityPage type="municipio" />);

    expect(screen.getByRole("heading", { name: "Nenhum registro oficial corresponde a este recorte." })).toBeTruthy();
    expect(screen.queryByText("Emenda 0017")).toBeNull();
    const result = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations).toEqual([]);
  });

  it("mantém o card de resultado semanticamente válido quando o parlamentar corresponde", async () => {
    window.history.replaceState({}, "", "/parlamentares/GENERAL%20GIRAO?ano=2025");
    const { container } = render(<EntityPage type="parlamentar" />);

    expect(screen.getByText("Emenda 0017")).toBeTruthy();
    expect(container.querySelector("a a")).toBeNull();
    const result = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations).toEqual([]);
  });
});
