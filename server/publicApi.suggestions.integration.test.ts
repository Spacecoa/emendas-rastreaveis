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

describe("API pública de sugestões", () => {
  it("retorna grupos oficiais de emenda, autoria, CNPJ, município e objeto sem mocks", async () => {
    const [amendment, author, cnpj, municipality, object] = await Promise.all([
      fetch(`${baseUrl}/api/v1/sugestoes?q=0010`).then(response => response.json()),
      fetch(`${baseUrl}/api/v1/sugestoes?q=BANCADA`).then(response => response.json()),
      fetch(`${baseUrl}/api/v1/sugestoes?q=33781055`).then(response => response.json()),
      fetch(`${baseUrl}/api/v1/sugestoes?q=Itatia`).then(response => response.json()),
      fetch(`${baseUrl}/api/v1/sugestoes?q=Constru`).then(response => response.json()),
    ]);

    expect(amendment.data.amendments.length).toBeGreaterThan(0);
    expect(author.data.authors.length).toBeGreaterThan(0);
    expect(cnpj.data.beneficiaries[0]?.cnpj).toMatch(/^\d{14}$/);
    expect(municipality.data.municipalities[0]).toMatchObject({ name: "Itatiaia", uf: "RJ" });
    expect(object.data.objects.length).toBeGreaterThan(0);
  });
});
