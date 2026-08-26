import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  dataSources,
  ingestionRuns,
  sourceCatalogEntries,
} from "../drizzle/schema";
import { getDb } from "./db";

describe("conciliação CGU e Transferegov", () => {
  it("registra a taxa nacional por emenda CGU e só vincula catálogo com chave explícita", async () => {
    const db = await getDb();
    if (!db) {
      throw new Error(
        "Banco de dados indisponível para validar a conciliação."
      );
    }

    const [source] = await db
      .select({ id: dataSources.id, note: dataSources.coverageNote })
      .from(dataSources)
      .where(eq(dataSources.name, "Transferegov — Emendas"))
      .limit(1);
    if (!source) {
      throw new Error("Fonte de emendas Transferegov não foi carregada.");
    }

    const [run] = await db
      .select({
        extracted: ingestionRuns.recordsExtracted,
        matched: ingestionRuns.recordsMatched,
        rate: ingestionRuns.matchRate,
      })
      .from(ingestionRuns)
      .where(eq(ingestionRuns.sourceId, source.id))
      .orderBy(desc(ingestionRuns.id))
      .limit(1);
    const linkedPhysicalCatalog = await db
      .select({ amendmentId: sourceCatalogEntries.amendmentId })
      .from(sourceCatalogEntries)
      .where(
        and(
          inArray(sourceCatalogEntries.recordKind, ["objeto", "instrumento"]),
          eq(sourceCatalogEntries.referenceYear, 2025),
          eq(sourceCatalogEntries.reconciliationStatus, "conciliado"),
          isNotNull(sourceCatalogEntries.amendmentId)
        )
      );
    const emendaRows = await db
      .select({
        id: sourceCatalogEntries.id,
        amendmentId: sourceCatalogEntries.amendmentId,
      })
      .from(sourceCatalogEntries)
      .where(
        and(
          eq(sourceCatalogEntries.recordKind, "emenda_transferegov"),
          eq(sourceCatalogEntries.referenceYear, 2025)
        )
      );

    expect(run).toMatchObject({
      extracted: 6311,
      matched: 4710,
      rate: "0.7463",
    });
    expect(source.note).toContain("4710 de 6311");
    expect(emendaRows).toHaveLength(61402);
    expect(
      new Set(emendaRows.map(entry => entry.amendmentId).filter(Boolean)).size
    ).toBe(4710);
    expect(linkedPhysicalCatalog).toHaveLength(2413);
    expect(
      linkedPhysicalCatalog.every(entry => entry.amendmentId !== null)
    ).toBe(true);
  });
});
