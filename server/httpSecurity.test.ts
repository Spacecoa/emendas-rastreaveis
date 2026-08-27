import express from "express";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerPublicHttpSecurity } from "./httpSecurity";

let server: ReturnType<ReturnType<typeof express>["listen"]>;
let baseUrl = "";

beforeAll(async () => {
  const app = express();
  registerPublicHttpSecurity(app);
  app.get("/api/v1/cliente", (req, res) => res.json({ client: req.ip }));
  await new Promise<void>(resolve => {
    server = app.listen(0, "127.0.0.1", () => {
      baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()));
});

describe("proteção HTTP pública", () => {
  it("considera o IP encaminhado por um único proxy confiável", async () => {
    const response = await fetch(`${baseUrl}/api/v1/cliente`, {
      headers: { "x-forwarded-for": "198.51.100.25" },
    });
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.client).toBe("198.51.100.25");
  });

  it("limita a taxa por cliente, em vez de compartilhar o limite entre IPs", async () => {
    const app = express();
    app.set("trust proxy", 1);
    const { createPublicRateLimiter } = await import("./publicRateLimit");
    app.use(
      "/api/v1",
      createPublicRateLimiter({ maxRequests: 2, windowMs: 60_000 })
    );
    app.get("/api/v1/teste", (_req, res) => res.json({ ok: true }));
    const localServer = await new Promise<ReturnType<typeof app.listen>>(
      resolve => {
        const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
      }
    );
    const localUrl = `http://127.0.0.1:${(localServer.address() as AddressInfo).port}/api/v1/teste`;
    const fromFirstClient = { "x-forwarded-for": "198.51.100.40" };
    const fromSecondClient = { "x-forwarded-for": "198.51.100.41" };

    try {
      expect((await fetch(localUrl, { headers: fromFirstClient })).status).toBe(
        200
      );
      expect((await fetch(localUrl, { headers: fromFirstClient })).status).toBe(
        200
      );
      const blocked = await fetch(localUrl, { headers: fromFirstClient });
      expect(blocked.status).toBe(429);
      expect(blocked.headers.get("retry-after")).toBeTruthy();
      expect(
        (await fetch(localUrl, { headers: fromSecondClient })).status
      ).toBe(200);
    } finally {
      await new Promise<void>(resolve => localServer.close(() => resolve()));
    }
  });
});
