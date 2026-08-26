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

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      code: "202539940017",
      author: "GENERAL GIRAO",
      budgetFunction: "Defesa nacional",
    });
  });

  it("restringe UF a vínculo territorial documental e não usa localidade textual", async () => {
    const [alagoas, minasGerais] = await Promise.all([
      searchStoredAmendments({ query: "", year: 2025, uf: "AL", page: 1 }),
      searchStoredAmendments({ query: "", year: 2025, uf: "MG", page: 1 }),
    ]);

    expect(alagoas).toHaveLength(1);
    expect(alagoas[0]).toMatchObject({ code: "202529730007" });
    expect(minasGerais).toHaveLength(0);
  });
});
