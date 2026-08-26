import type { Express, Request, Response } from "express";
import { fetchPortalAmendments } from "./portalTransparency";
import { and, eq, like, or } from "drizzle-orm";
import { amendments, authors, beneficiaries, municipalities, sourceCatalogEntries } from "../drizzle/schema";
import { getDb } from "./db";

function parseYear(value: unknown) {
  const parsed = Number(value ?? new Date().getFullYear());
  return Number.isInteger(parsed) && parsed >= 2016 && parsed <= 2100 ? parsed : null;
}

export async function getOfficialSuggestions(query: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  const pattern = `%${query}%`;
  const cnpjPattern = /^\d+$/.test(query) ? `${query}%` : pattern;
  const [amendmentRows, authorRows, beneficiaryRows, municipalityRows, objectRows] = await Promise.all([
    db.select({ code: amendments.code, number: amendments.amendmentNumber, year: amendments.year }).from(amendments).where(or(like(amendments.code, pattern), like(amendments.amendmentNumber, pattern))).limit(5),
    db.select({ name: authors.name }).from(authors).where(like(authors.name, pattern)).limit(5),
    db.select({ cnpj: beneficiaries.cnpj, name: beneficiaries.name, sourceUrl: beneficiaries.sourceUrl }).from(beneficiaries).where(/^\d+$/.test(query) ? like(beneficiaries.cnpj, cnpjPattern) : like(beneficiaries.name, pattern)).limit(5),
    db.select({ name: municipalities.name, uf: municipalities.uf, sourceUrl: municipalities.sourceUrl }).from(municipalities).where(like(municipalities.name, pattern)).limit(5),
    db.select({ label: sourceCatalogEntries.label, sourceUrl: sourceCatalogEntries.sourceUrl }).from(sourceCatalogEntries).where(and(eq(sourceCatalogEntries.recordKind, "objeto"), like(sourceCatalogEntries.label, pattern))).limit(5),
  ]);
  return {
    amendments: amendmentRows.map(row => ({ code: String(row.code), number: row.number === null ? null : String(row.number), year: row.year })),
    authors: authorRows.map(row => ({ name: String(row.name) })),
    beneficiaries: beneficiaryRows.map(row => ({ cnpj: row.cnpj === null ? null : String(row.cnpj), name: String(row.name), sourceUrl: row.sourceUrl })),
    municipalities: municipalityRows.map(row => ({ name: String(row.name), uf: String(row.uf), sourceUrl: row.sourceUrl })),
    objects: objectRows.map(row => ({ label: String(row.label), sourceUrl: row.sourceUrl })),
  };
}

export function registerPublicApi(app: Express) {
  app.get("/api/v1/openapi.json", (_req, res) => {
    res.json({
      openapi: "3.0.3",
      info: {
        title: "API pública — Emendas em Foco",
        version: "0.1.0",
        description: "Dados oficiais de emendas com proveniência. Campos ainda não fornecidos pelas fontes são retornados como null.",
      },
      paths: {
        "/api/v1/emendas": {
          get: {
            summary: "Consulta emendas na fonte oficial configurada",
            parameters: [
              { name: "ano", in: "query", schema: { type: "integer", example: 2025 } },
              { name: "uf", in: "query", schema: { type: "string", minLength: 2, maxLength: 2, example: "RJ" } },
              { name: "q", in: "query", schema: { type: "string", example: "saúde" } },
              { name: "pagina", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
            ],
            responses: { "200": { description: "Registros oficiais e metadados de proveniência." }, "400": { description: "Parâmetros inválidos." }, "502": { description: "Fonte oficial indisponível." } },
          },
        },
        "/api/v1/sugestoes": {
          get: {
            summary: "Sugestões oficiais de emendas, autores, beneficiários, municípios e objetos",
            parameters: [{ name: "q", in: "query", required: true, schema: { type: "string", minLength: 2, example: "Itatia" } }],
            responses: { "200": { description: "Sugestões agrupadas com origem oficial." }, "400": { description: "Parâmetro inválido." } },
          },
        },
      },
    });
  });

  app.get("/api/v1/emendas", async (req: Request, res: Response) => {
    const year = parseYear(req.query.ano);
    const page = Number(req.query.pagina ?? 1);
    const uf = typeof req.query.uf === "string" && /^[A-Za-z]{2}$/.test(req.query.uf) ? req.query.uf.toUpperCase() : undefined;
    const query = typeof req.query.q === "string" ? req.query.q.trim().toLocaleLowerCase("pt-BR") : "";
    if (!year || !Number.isInteger(page) || page < 1 || page > 100) return res.status(400).json({ error: "Parâmetros inválidos." });

    try {
      const records = await fetchPortalAmendments({ year, page, uf });
      const filtered = query
        ? records.filter(record => [record.author, record.locality, record.number, record.code, record.budgetFunction, record.budgetSubfunction, record.type].filter(Boolean).some(value => value?.toLocaleLowerCase("pt-BR").includes(query)))
        : records;
      res.set("Cache-Control", "public, max-age=300");
      return res.json({
        data: filtered,
        meta: {
          year,
          uf: uf ?? null,
          page,
          count: filtered.length,
          coverage: "Consulta de uma página da fonte oficial. A base conciliada nacional é publicada à medida que as cargas forem concluídas.",
        },
      });
    } catch (error) {
      return res.status(502).json({ error: "Não foi possível consultar a fonte oficial neste momento." });
    }
  });

  app.get("/api/v1/sugestoes", async (req: Request, res: Response) => {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (query.length < 2) return res.status(400).json({ error: "Informe ao menos dois caracteres em q." });
    try {
      return res.json({
        data: await getOfficialSuggestions(query),
        meta: { query, reconciliationNote: "Objetos de propostas ainda não conciliados com emendas são exibidos somente como sugestões de busca." },
      });
    } catch {
      return res.status(503).json({ error: "Não foi possível consultar as sugestões oficiais neste momento." });
    }
  });
}
