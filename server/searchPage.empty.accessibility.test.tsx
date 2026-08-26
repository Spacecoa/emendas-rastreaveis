// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    emendas: {
      search: {
        useQuery: () => ({
          isLoading: false,
          error: null,
          data: { records: [], sourceCoverage: "Resultados da carga oficial persistida." },
        }),
      },
      suggestions: { useQuery: () => ({ data: { amendments: [], authors: [], beneficiaries: [], municipalities: [], objects: [] } }) },
    },
  },
}));

vi.mock("wouter", () => ({
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
  useLocation: () => ["/busca"],
  useSearch: () => "?q=termo-inexistente&ano=2025&uf=RJ",
}));

import SearchPage from "../client/src/pages/SearchPage";

describe("estado vazio da busca pública", () => {
  it("informa ausência de resultados sem afirmar ausência de conciliação e não cria violações axe", async () => {
    const { container } = render(<SearchPage />);

    expect(screen.getByRole("heading", { name: "Nenhum registro encontrado para este recorte." })).toBeTruthy();
    expect(screen.queryByText(/Nenhuma emenda conciliada/i)).toBeNull();

    const result = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations).toEqual([]);
  });
});
