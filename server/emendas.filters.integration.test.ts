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
});
