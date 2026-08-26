// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";

const officialRecord = {
  code: "202539940017",
  year: 2025,
  number: "0017",
  author: "GENERAL GIRAO",
  locality: "RIO GRANDE DO NORTE (UF)",
  type: "Emenda Individual",
  budgetFunction: "Defesa nacional",
  budgetSubfunction: null,
  committed: 39989.35,
  settled: 39989.35,
  paid: 39989.35,
  remainingRegistered: null,
  remainingCancelled: null,
  remainingPaid: null,
  complianceStatus: "informacao_insuficiente" as const,
  source: "Portal da Transparência (CGU)" as const,
  sourceUrl: "https://api.portaldatransparencia.gov.br/",
  extractedAt: "2026-08-26T00:32:00.000Z",
  recordHash: "hash-oficial-teste",
};
const receivedInputs: unknown[] = [];

vi.mock("@/lib/trpc", () => ({
  trpc: {
    emendas: {
      search: {
        useQuery: (input: unknown) => {
          receivedInputs.push(input);
          return {
            data: {
              records: [officialRecord],
              sourceCoverage: "Carga oficial persistida",
            },
            isLoading: false,
            error: null,
          };
        },
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
    },
  },
}));

import SearchPage from "../client/src/pages/SearchPage";

afterEach(() => {
  receivedInputs.length = 0;
  vi.unstubAllGlobals();
});

describe("exportação do recorte da busca", () => {
  it("preserva filtros combinados na consulta e exporta apenas o registro retornado", async () => {
    window.history.replaceState(
      {},
      "",
      "/busca?ano=2025&uf=RJ&situacao=informacao_insuficiente&pagoMin=0&autor=GENERAL%20GIRAO&funcao=Defesa%20nacional"
    );
    const createdBlobs: Blob[] = [];
    const createObjectURL = vi.fn((value: Blob) => {
      createdBlobs.push(value);
      return "blob:recorte";
    });
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    render(<SearchPage />);
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
    fireEvent.click(screen.getByRole("button", { name: "JSON" }));
    fireEvent.click(screen.getByRole("button", { name: "XLSX" }));

    await waitFor(() => expect(createdBlobs).toHaveLength(3));

    expect(receivedInputs).toContainEqual(
      expect.objectContaining({
        year: 2025,
        uf: "RJ",
        status: "informacao_insuficiente",
        minPaid: 0,
        author: "GENERAL GIRAO",
        budgetFunction: "Defesa nacional",
      })
    );
    expect(click).toHaveBeenCalledTimes(3);

    const csv = await createdBlobs[0]!.text();
    expect(csv).toContain("codigo_emenda");
    expect(csv).toContain("202539940017");
    expect(csv).toContain("GENERAL GIRAO");
    expect(csv).toContain("Defesa nacional");

    const exported = JSON.parse(await createdBlobs[1]!.text());
    expect(exported).toEqual([
      expect.objectContaining({
        codigo_emenda: "202539940017",
        autor: "GENERAL GIRAO",
        funcao: "Defesa nacional",
        valor_pago: 39989.35,
      }),
    ]);

    const workbook = XLSX.read(await createdBlobs[2]!.arrayBuffer(), {
      type: "array",
    });
    const spreadsheetRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets.Emendas
    );
    expect(spreadsheetRows).toEqual([
      expect.objectContaining({
        codigo_emenda: "202539940017",
        autor: "GENERAL GIRAO",
        funcao: "Defesa nacional",
        valor_pago: 39989.35,
      }),
    ]);
  });

  it.each(["AL", "SE", "MG"])(
    "submete a UF %s pela própria interface e preserva o recorte na URL",
    uf => {
      window.history.replaceState({}, "", "/busca?ano=2025");
      render(<SearchPage />);

      const ufInput = screen.getByLabelText("UF");
      fireEvent.change(ufInput, { target: { value: uf } });
      fireEvent.submit(ufInput.closest("form")!);

      expect(window.location.search).toContain(`uf=${uf}`);
      expect(window.location.search).toContain("ano=2025");
      expect(receivedInputs).toContainEqual(
        expect.objectContaining({ year: 2025, uf })
      );
    }
  );
});
