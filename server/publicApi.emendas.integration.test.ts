import express from "express";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerPublicApi } from "./publicApi";

let server: ReturnType<ReturnType<typeof express>["listen"]>;
let baseUrl = "";

beforeAll(async () => {
  const app = express();
  registerPublicApi(app);
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

describe("API pública de emendas", () => {
  it("consulta a carga oficial persistida e expõe os filtros de situação e valor pago", async () => {
    const response = await fetch(`${baseUrl}/api/v1/emendas?ano=2025&uf=RJ&status=informacao_insuficiente&minPaid=0`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.meta).toMatchObject({ year: 2025, uf: "RJ", status: "informacao_insuficiente", minPaid: 0 });
    expect(payload.meta.coverage).toContain("carga oficial persistida");
    expect(Array.isArray(payload.data)).toBe(true);
    expect(payload.data.every((record: { complianceStatus: string; paid: number | null }) => record.complianceStatus === "informacao_insuficiente" && record.paid !== null && record.paid >= 0)).toBe(true);
  });

  it("recusa parâmetros de filtro inválidos", async () => {
    const response = await fetch(`${baseUrl}/api/v1/emendas?ano=2025&status=entregue`);
    expect(response.status).toBe(400);
  });

  it("pagina a carga oficial persistida sem repetir os registros da primeira página", async () => {
    const [firstResponse, secondResponse] = await Promise.all([
      fetch(`${baseUrl}/api/v1/emendas?ano=2025&pagina=1`),
      fetch(`${baseUrl}/api/v1/emendas?ano=2025&pagina=2`),
    ]);
    const [firstPage, secondPage] = await Promise.all([firstResponse.json(), secondResponse.json()]);
    const firstCodes = new Set(firstPage.data.map((record: { code: string }) => record.code));

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(firstPage.meta.page).toBe(1);
    expect(secondPage.meta.page).toBe(2);
    expect(firstPage.data.length).toBeGreaterThan(0);
    expect(secondPage.data.length).toBeGreaterThan(0);
    expect(secondPage.data.some((record: { code: string }) => firstCodes.has(record.code))).toBe(false);
  });
});
