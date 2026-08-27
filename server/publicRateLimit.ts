import type { Request, RequestHandler } from "express";

type RateLimitOptions = {
  maxRequests: number;
  windowMs: number;
  maxTrackedClients?: number;
};

type ClientRequest = Pick<Request, "ip" | "socket">;

/**
 * `req.ip` respeita a configuração `trust proxy` da aplicação. O fallback é
 * usado somente em ambientes locais que não informam um IP pela camada HTTP.
 */
export function getClientRequestKey(req: ClientRequest) {
  const address =
    req.ip?.trim() || req.socket.remoteAddress?.trim() || "unknown";
  return `ip:${address.slice(0, 128)}`;
}

export function createPublicRateLimiter({
  maxRequests,
  windowMs,
  maxTrackedClients = 5_000,
}: RateLimitOptions): RequestHandler {
  const timestampsByClient = new Map<string, number[]>();

  function prune(now: number) {
    for (const [key, timestamps] of Array.from(timestampsByClient.entries())) {
      const recent = timestamps.filter(timestamp => now - timestamp < windowMs);
      if (recent.length) timestampsByClient.set(key, recent);
      else timestampsByClient.delete(key);
    }
    while (timestampsByClient.size >= maxTrackedClients) {
      const oldestKey = Array.from(timestampsByClient.keys())[0];
      if (!oldestKey) break;
      timestampsByClient.delete(oldestKey);
    }
  }

  return (req, res, next) => {
    const now = Date.now();
    if (timestampsByClient.size >= maxTrackedClients) prune(now);

    const key = getClientRequestKey(req);
    const recent = (timestampsByClient.get(key) ?? []).filter(
      timestamp => now - timestamp < windowMs
    );
    if (recent.length >= maxRequests) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((recent[0] + windowMs - now) / 1_000)
      );
      res.set("Retry-After", String(retryAfterSeconds)).status(429).json({
        error:
          "Muitas consultas em pouco tempo. Aguarde um minuto e tente novamente.",
      });
      return;
    }

    recent.push(now);
    timestampsByClient.set(key, recent);
    next();
  };
}
