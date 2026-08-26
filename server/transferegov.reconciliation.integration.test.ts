import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { dataSources, ingestionRuns, sourceCatalogEntries } from "../drizzle/schema";
import { getDb } from "./db";

describe("conciliação CGU e Transferegov", () => {
  it("registra a taxa calculada por emenda CGU e só vincula catálogo com chave explícita", async () => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível para validar a conciliação.");

    const [source] = await db.select({ id: dataSources.id, note: dataSources.coverageNote })
      .from(dataSources).where(eq(dataSources.name, "Transferegov — Emendas")).limit(1);
    if (!source) throw new Error("Fonte de emendas Transferegov não foi carregada.");

    const [run] = await db.select({
      extracted: ingestionRuns.recordsExtracted,
      matched: ingestionRuns.recordsMatched,
      rate: ingestionRuns.matchRate,
    }).from(ingestionRuns).where(eq(ingestionRuns.sourceId, source.id)).orderBy(desc(ingestionRuns.id)).limit(1);
    const linkedPhysicalCatalog = await db.select({ amendmentId: sourceCatalogEntries.amendmentId, uf: sourceCatalogEntries.uf })
      .from(sourceCatalogEntries)
      .where(and(
        inArray(sourceCatalogEntries.recordKind, ["objeto", "instrumento"]),
        eq(sourceCatalogEntries.reconciliationStatus, "conciliado"),
        isNotNull(sourceCatalogEntries.amendmentId),
      ));
    const emendaRows = await db.select({ id: sourceCatalogEntries.id })
      .from(sourceCatalogEntries)
      .where(eq(sourceCatalogEntries.recordKind, "emenda_transferegov"));

    expect(run).toMatchObject({ extracted: 75, matched: 55, rate: "0.7333" });
    expect(source.note).toContain("55 de 75");
    expect(emendaRows).toHaveLength(662);
    expect(linkedPhysicalCatalog.length).toBeGreaterThan(0);
    expect(linkedPhysicalCatalog.every(entry => entry.amendmentId !== null)).toBe(true);
    expect(linkedPhysicalCatalog.filter(entry => entry.uf !== "RJ")).toHaveLength(2);
  });
});
