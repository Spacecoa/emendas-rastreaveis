import { and, eq, isNotNull, like } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { beneficiaries, sourceCatalogEntries } from "../drizzle/schema";
import { getDb } from "./db";

describe("catálogo oficial do Transferegov", () => {
  it("mantém CNPJ de beneficiário e objetos do recorte RJ/2025 com proveniência", async () => {
    const db = await getDb();
    expect(db, "Banco de dados indisponível para a verificação de integração").toBeTruthy();
    if (!db) return;

    const [beneficiary] = await db.select({ cnpj: beneficiaries.cnpj, sourceUrl: beneficiaries.sourceUrl })
      .from(beneficiaries)
      .where(and(eq(beneficiaries.source, "Transferegov — Proponentes"), isNotNull(beneficiaries.cnpj)))
      .limit(1);
    const [object] = await db.select({ label: sourceCatalogEntries.label, sourceUrl: sourceCatalogEntries.sourceUrl })
      .from(sourceCatalogEntries)
      .where(and(eq(sourceCatalogEntries.recordKind, "objeto"), eq(sourceCatalogEntries.uf, "RJ"), eq(sourceCatalogEntries.referenceYear, 2025), like(sourceCatalogEntries.label, "%Constru%")))
      .limit(1);

    expect(beneficiary?.cnpj).toMatch(/^\d{14}$/);
    expect(beneficiary?.sourceUrl).toContain("repositorio.dados.gov.br");
    expect(object?.label).toContain("Constru");
    expect(object?.sourceUrl).toContain("siconv_proposta.csv.zip");
  });
});
