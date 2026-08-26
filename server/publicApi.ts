import type { Express, Request, Response } from "express";
import { fetchPortalAmendments } from "./portalTransparency";

function parseYear(value: unknown) {
  const parsed = Number(value ?? new Date().getFullYear());
  return Number.isInteger(parsed) && parsed >= 2016 && parsed <= 2100 ? parsed : null;
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
}
