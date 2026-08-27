import type { Express } from "express";
import { createPublicRateLimiter } from "./publicRateLimit";

/**
 * Configura limites para todas as rotas públicas e usa somente o proxy reverso
 * imediatamente anterior como fonte de `req.ip`.
 */
export function registerPublicHttpSecurity(app: Express) {
  app.set("trust proxy", 1);
  const publicRequestRateLimit = createPublicRateLimiter({
    maxRequests: 120,
    windowMs: 60_000,
  });
  app.use("/api/v1", publicRequestRateLimit);
  app.use("/api/trpc", publicRequestRateLimit);
}
