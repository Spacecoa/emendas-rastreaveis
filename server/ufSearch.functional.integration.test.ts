import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { buildExportBlob } from "../client/src/pages/SearchPage";
import { searchStoredAmendments } from "./emendas";

const cases = [
  { uf: "AL", code: "202529730007", locality: "ALAGOAS (UF)" },
  { uf: "SE", code: "202543440009", locality: "SERGIPE (UF)" },
] as const;

describe("validação funcional por UF com registros oficiais persistidos", () => {
  it.each(cases)("consulta, fonte e exportações preservam o recorte de $uf", async ({ uf, code, locality }) => {
    const records = await searchStoredAmendments({ query: "", year: 2025, uf, page: 1 });

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ code, locality });
    expect(records[0]?.sourceUrl).toMatch(/^https:\/\/api\.portaldatransparencia\.gov\.br\//);

    const csv = await buildExportBlob(records, "csv").text();
    expect(csv).toContain(code);
    expect(csv).toContain(records[0]!.recordHash);

    const json = JSON.parse(await buildExportBlob(records, "json").text());
    expect(json).toEqual([expect.objectContaining({ codigo_emenda: code, localidade: locality, url_origem: records[0]!.sourceUrl })]);

    const workbook = XLSX.read(await buildExportBlob(records, "xlsx").arrayBuffer(), { type: "array" });
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Emendas);
    expect(rows).toEqual([expect.objectContaining({ codigo_emenda: code, localidade: locality, hash_registro: records[0]!.recordHash })]);
  });

  it("mantém MG vazia e não oferece registro de outra UF para exportação", async () => {
    const records = await searchStoredAmendments({ query: "", year: 2025, uf: "MG", page: 1 });
    expect(records).toHaveLength(0);
    expect(await buildExportBlob(records, "json").text()).toBe("[]");
  });
});
