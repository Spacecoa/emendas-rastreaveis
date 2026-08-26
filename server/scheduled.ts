import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { sourceRefreshConfigs } from "../drizzle/schema";
import { getDb } from "./db";
import { runInitialPortalLoad } from "./emendas";
import { sdk } from "./_core/sdk";

export function registerScheduledHandlers(app: Express) {
  app.post("/api/scheduled/sync-official-sources", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "Apenas tarefas agendadas podem executar esta carga." });

      const db = await getDb();
      if (!db) return res.status(503).json({ error: "Banco de dados indisponível." });
      const config = (await db.select().from(sourceRefreshConfigs).where(eq(sourceRefreshConfigs.scheduleCronTaskUid, user.taskUid)).limit(1))[0];
      if (!config || !config.enabled) return res.json({ ok: true, skipped: "configuração ausente ou desativada" });

      const result = await runInitialPortalLoad(config.targetYear, 5);
      await db.update(sourceRefreshConfigs).set({ lastRunAt: new Date() }).where(eq(sourceRefreshConfigs.id, config.id));
      return res.json({ ok: true, ...result });
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Falha desconhecida na carga.",
        timestamp: new Date().toISOString(),
      });
    }
  });
}
