// @vitest-environment jsdom
import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const records = {
  AL: {
    code: "202529730007",
    year: 2025,
    number: "0007",
    author: "PAULÃO",
    locality: "ALAGOAS (UF)",
    type: "Emenda Individual - Transferências com Finalidade Definida",
    budgetFunction: "Desporto e lazer",
    budgetSubfunction: null,
    committed: 99997.72,
    settled: 0,
    paid: 0,
    remainingRegistered: 1600.14,
    remainingCancelled: 0,
    remainingPaid: null,
    complianceStatus: "em_execucao" as const,
    source: "Portal da Transparência (CGU)" as const,
    sourceUrl:
      "https://api.portaldatransparencia.gov.br/api-de-dados/emendas?ano=2025&pagina=1",
    extractedAt: "2026-08-26T04:25:00.000Z",
    recordHash: "hash-al-oficial",
  },
  SE: {
    code: "202543440009",
    year: 2025,
    number: "0009",
    author: "DELEGADA KATARINA",
    locality: "SERGIPE (UF)",
    type: "Emenda Individual - Transferências com Finalidade Definida",
    budgetFunction: "Direitos da cidadania",
    budgetSubfunction: null,
    committed: 100000,
    settled: 100000,
    paid: 100000,
    remainingRegistered: 0,
    remainingCancelled: 0,
    remainingPaid: null,
    complianceStatus: "informacao_insuficiente" as const,
    source: "Portal da Transparência (CGU)" as const,
    sourceUrl:
      "https://api.portaldatransparencia.gov.br/api-de-dados/emendas?ano=2025&pagina=10",
    extractedAt: "2026-08-26T04:25:00.000Z",
    recordHash: "hash-se-oficial",
  },
  MG: {
    code: "202514030006",
    year: 2025,
    number: "0006",
    author: "LEONARDO MONTEIRO",
    locality: "Nacional",
    type: "Emenda Individual - Transferências com Finalidade Definida",
    budgetFunction: "Direitos da cidadania",
    budgetSubfunction: "Direitos individuais, coletivos e difusos",
    committed: 1000000,
    settled: 0,
    paid: 0,
    remainingRegistered: 0,
    remainingCancelled: 0,
    remainingPaid: 1000000,
    complianceStatus: "em_execucao" as const,
    source: "Portal da Transparência (CGU)" as const,
    sourceUrl:
      "https://dadosabertos-download.cgu.gov.br/PortalDaTransparencia/saida/emendas-parlamentares/EmendasParlamentares.zip",
    extractedAt: "2026-08-26T05:42:39.000Z",
    recordHash:
      "4df8c2c078bc2c84a09f9de59a8354ba34a68bd65c83cada907875cb19517410",
  },
} as const;

vi.mock("@/lib/trpc", () => ({
  trpc: {
    emendas: {
      search: {
        useQuery: (input: { uf?: keyof typeof records }) => ({
          data: {
            records: input.uf && input.uf in records ? [records[input.uf]] : [],
            sourceCoverage: "O filtro UF usa vínculo territorial documental.",
          },
          isLoading: false,
          error: null,
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
          isFetching: false,
        }),
      },
      byCode: {
        useQuery: ({ code }: { code: string }) => ({
          data:
            Object.values(records).find(record => record.code === code) ?? null,
          isLoading: false,
        }),
      },
      documents: {
        useQuery: () => ({ data: { items: [] }, isFetching: false }),
      },
    },
  },
}));

import SearchPage from "../client/src/pages/SearchPage";
import AmendmentPage from "../client/src/pages/AmendmentPage";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("fluxo visível de busca territorial", () => {
  it.each([
    {
      uf: "AL",
      number: "0007",
      code: records.AL.code,
      locality: records.AL.locality,
    },
    {
      uf: "SE",
      number: "0009",
      code: records.SE.code,
      locality: records.SE.locality,
    },
    {
      uf: "MG",
      number: "0006",
      code: records.MG.code,
      locality: records.MG.locality,
    },
  ])(
    "submete $uf, renderiza somente o resultado territorial e navega ao detalhe",
    async ({ uf, number, code, locality }) => {
      window.history.replaceState({}, "", "/busca?ano=2025");
      render(<SearchPage />);
      const ufInput = screen.getByLabelText("UF");
      fireEvent.change(ufInput, { target: { value: uf } });
      fireEvent.submit(ufInput.closest("form")!);

      await waitFor(() =>
        expect(screen.getByText(`Emenda ${number}`)).toBeTruthy()
      );
      expect(screen.getByText(locality)).toBeTruthy();
      expect(screen.getByLabelText("Exportar recorte")).toBeTruthy();
      const detail = screen.getByRole("link", {
        name: `Ver a emenda ${number}`,
      });
      expect(detail.getAttribute("href")).toBe(`/emendas/${code}?ano=2025`);
      fireEvent.click(detail);
      expect(window.location.pathname).toBe(`/emendas/${code}`);
    }
  );

  it("renderiza estado vazio para UF sem vínculo documental", async () => {
    window.history.replaceState({}, "", "/busca?ano=2025");
    render(<SearchPage />);
    const ufInput = screen.getByLabelText("UF");
    fireEvent.change(ufInput, { target: { value: "ZZ" } });
    fireEvent.submit(ufInput.closest("form")!);

    await waitFor(() =>
      expect(
        screen.getByText("Nenhum registro encontrado para este recorte.")
      ).toBeTruthy()
    );
    expect(screen.queryByLabelText("Exportar recorte")).toBeNull();
    expect(screen.queryByRole("link", { name: /Ver a emenda/ })).toBeNull();
    expect(screen.queryByText("ALAGOAS (UF)")).toBeNull();
    expect(screen.queryByText("SERGIPE (UF)")).toBeNull();
  });

  it.each(Object.values(records))(
    "exibe no detalhe a fonte oficial da emenda $code",
    record => {
      window.history.replaceState({}, "", `/emendas/${record.code}?ano=2025`);
      render(<AmendmentPage />);
      const source = screen.getByRole("link", {
        name: /Abrir consulta oficial/,
      });
      expect(source.getAttribute("href")).toBe(record.sourceUrl);
      expect(screen.getByText(record.author)).toBeTruthy();
    }
  );
});
