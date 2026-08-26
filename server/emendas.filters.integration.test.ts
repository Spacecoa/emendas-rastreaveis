import { describe, expect, it } from "vitest";
import { searchStoredAmendments } from "./emendas";

describe("filtros combináveis da carga persistida", () => {
  it("combina autoria e função orçamentária sem alargar o recorte oficial", async () => {
    const records = await searchStoredAmendments({
      query: "",
      year: 2025,
      author: "GENERAL GIRAO",
      budgetFunction: "Defesa nacional",
      page: 1,
    });

    expect(records.length).toBeGreaterThan(0);
    expect(records).toContainEqual(
      expect.objectContaining({
        code: "202539940017",
        author: "GENERAL GIRAO",
        budgetFunction: "Defesa nacional",
      })
    );
    expect(
      records.every(
        record =>
          record.author === "GENERAL GIRAO" &&
          record.budgetFunction === "Defesa nacional"
      )
    ).toBe(true);
  });

  it("restringe UF a vínculo territorial documental e não usa fallback por localidade", async () => {
    const [alagoas, minasGerais, ufSemEvidencia] = await Promise.all([
      searchStoredAmendments({ query: "", year: 2025, uf: "AL", page: 1 }),
      searchStoredAmendments({ query: "", year: 2025, uf: "MG", page: 1 }),
      searchStoredAmendments({ query: "", year: 2025, uf: "ZZ", page: 1 }),
    ]);

    expect(alagoas.length).toBeGreaterThan(0);
    expect(minasGerais.length).toBeGreaterThan(0);
    expect(alagoas).toContainEqual(
      expect.objectContaining({ code: "202529730007" })
    );
    expect(ufSemEvidencia).toEqual([]);
  });
});
