// @vitest-environment jsdom
import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    emendas: {
      search: {
        useQuery: () => ({
          isFetching: false,
          data: {
            records: [
              {
                code: "EXEMPLO-001",
                year: 2025,
                number: "0001",
                author: "Autoria Oficial",
                locality: "Município Oficial - RJ",
                type: "Emenda Individual",
                budgetFunction: "Saúde",
                budgetSubfunction: null,
                committed: 100,
                settled: 80,
                paid: 60,
                remainingRegistered: null,
                remainingCancelled: null,
                remainingPaid: null,
                complianceStatus: "em_execucao",
                source: "Portal da Transparência (CGU)",
                sourceUrl: "https://api.portaldatransparencia.gov.br/",
                extractedAt: "2026-08-26T00:00:00.000Z",
                recordHash: "hash",
              },
            ],
          },
        }),
      },
      suggestions: {
        useQuery: () => ({
          data: {
            beneficiaries: [
              {
                label: "20308871000184 · HAPKIDO DO BRASIL",
                value: "20308871000184",
              },
            ],
            municipalities: [{ label: "Itatiaia · RJ", value: "Itatiaia" }],
            objects: [
              {
                label: "Objeto oficial de teste",
                value: "Objeto oficial de teste",
              },
            ],
          },
        }),
      },
    },
  },
}));

import PortalLayout from "../client/src/components/PortalLayout";
import SearchPanel from "../client/src/components/SearchPanel";

describe("acessibilidade das áreas públicas críticas", () => {
  afterEach(cleanup);
  it("mantém navegação semântica, atalho de conteúdo e ausência de violações axe no contêiner público", async () => {
    const { container } = render(
      <PortalLayout>
        <h1>Consulta pública</h1>
        <p>Conteúdo verificável.</p>
      </PortalLayout>
    );
    expect(
      screen.getByText("Pular para o conteúdo principal").getAttribute("href")
    ).toBe("#conteudo");
    const result = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });

  it("expõe sugestões agrupadas e rótulos associados na busca", async () => {
    const { container } = render(<SearchPanel />);
    const input = screen.getByLabelText("O que você quer encontrar?");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "of" } });
    expect(within(container).getByText("Emendas")).toBeTruthy();
    expect(
      within(container).getByText("Parlamentares e bancadas")
    ).toBeTruthy();
    expect(within(container).getByText("Municípios")).toBeTruthy();
    expect(within(container).getByText("CNPJ e beneficiários")).toBeTruthy();
    expect(within(container).getByText("Objetos")).toBeTruthy();
    const result = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });

  it("abre e fecha a navegação móvel por um botão com estado acessível", () => {
    render(
      <PortalLayout>
        <h1>Consulta pública</h1>
      </PortalLayout>
    );
    const toggle = screen.getByRole("button", { name: "Abrir menu" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(toggle);
    expect(
      screen.getByRole("navigation", { name: "Navegação móvel" })
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Fechar menu" })
        .getAttribute("aria-expanded")
    ).toBe("true");
    expect(screen.getAllByText("Buscar emendas").length).toBeGreaterThan(1);

    fireEvent.click(screen.getByRole("button", { name: "Fechar menu" }));
    expect(
      screen.queryByRole("navigation", { name: "Navegação móvel" })
    ).toBeNull();
  });
});
