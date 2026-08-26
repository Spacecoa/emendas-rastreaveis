import { and, eq, isNotNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { municipalities } from "../drizzle/schema";
import { getDb } from "./db";

describe("carga oficial de população municipal do IBGE", () => {
  it("mantém estimativas RJ/2025 com código, ano de referência e URL oficial", async () => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível para validação da carga IBGE.");

    const rows = await db.select({
      name: municipalities.name,
      ibgeCode: municipalities.ibgeCode,
      population: municipalities.population,
      referenceYear: municipalities.populationReferenceYear,
      source: municipalities.populationSource,
      sourceUrl: municipalities.populationSourceUrl,
    }).from(municipalities).where(and(eq(municipalities.uf, "RJ"), isNotNull(municipalities.population)));
    const angra = rows.find(row => row.ibgeCode === "3300100");

    expect(rows).toHaveLength(92);
    expect(angra).toMatchObject({
      name: "Angra dos Reis",
      population: 179142,
      referenceYear: 2025,
      source: "IBGE — Estimativas da População 2025",
    });
    expect(angra?.sourceUrl).toContain("POP2025_20260113.ods");
  });
});
