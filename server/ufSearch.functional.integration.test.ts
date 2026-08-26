import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { buildExportBlob } from "../client/src/pages/SearchPage";
import { searchStoredAmendments } from "./emendas";

const cases = [
  { uf: "AL", code: "202529730007" },
  { uf: "SE", code: "202543440009" },
] as const;

describe("validação funcional por UF com registros oficiais persistidos", () => {
  it.each(cases)(
    "consulta, fonte e exportações preservam o recorte de $uf",
    async ({ uf, code }) => {
      const records = await searchStoredAmendments({
        query: "",
        year: 2025,
        uf,
        page: 1,
      });

      expect(records.length).toBeGreaterThan(0);
      const selected = records.find(record => record.code === code);
      expect(selected).toBeTruthy();
      expect(selected?.sourceUrl).toBe(
        "https://dadosabertos-download.cgu.gov.br/PortalDaTransparencia/saida/emendas-parlamentares/EmendasParlamentares.zip"
      );
      const exportRecords = [selected!];

      const csv = await (await buildExportBlob(exportRecords, "csv")).text();
      expect(csv).toContain(code);
      expect(csv).toContain(selected!.recordHash);

      const json = JSON.parse(
        await (await buildExportBlob(exportRecords, "json")).text()
      );
      expect(json).toEqual([
        expect.objectContaining({
          codigo_emenda: code,
          localidade: selected!.locality,
          url_origem: selected!.sourceUrl,
        }),
      ]);

      const workbook = XLSX.read(
        await (await buildExportBlob(exportRecords, "xlsx")).arrayBuffer(),
        { type: "array" }
      );
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        workbook.Sheets.Emendas
      );
      expect(rows).toEqual([
        expect.objectContaining({
          codigo_emenda: code,
          localidade: selected!.locality,
          hash_registro: selected!.recordHash,
        }),
      ]);
    }
  );

  it("mantém MG restrita a seus próprios vínculos e não reutiliza registros de AL", async () => {
    const [minasGerais, alagoas] = await Promise.all([
      searchStoredAmendments({
      query: "",
      year: 2025,
      uf: "MG",
      page: 1,
      }),
      searchStoredAmendments({ query: "", year: 2025, uf: "AL", page: 1 }),
    ]);
    expect(minasGerais.length).toBeGreaterThan(0);
    expect(
      minasGerais.some(record =>
        alagoas.some(alagoasRecord => alagoasRecord.code === record.code)
      )
    ).toBe(false);
  });
});
