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
    const response = await fetch(
      `${baseUrl}/api/v1/emendas?ano=2025&uf=RJ&status=informacao_insuficiente&minPaid=0`
    );
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.meta).toMatchObject({
      year: 2025,
      uf: "RJ",
      status: "informacao_insuficiente",
      minPaid: 0,
    });
    expect(payload.meta.coverage).toContain("vínculo territorial documental");
    expect(Array.isArray(payload.data)).toBe(true);
    expect(
      payload.data.every(
        (record: { complianceStatus: string; paid: number | null }) =>
          record.complianceStatus === "informacao_insuficiente" &&
          record.paid !== null &&
          record.paid >= 0
      )
    ).toBe(true);
  });

  it("restringe UF a emendas com vínculo territorial documental e não retorna fallback sem evidência", async () => {
    const [alagoasResponse, minasGeraisResponse, ufSemEvidenciaResponse] =
      await Promise.all([
        fetch(`${baseUrl}/api/v1/emendas?ano=2025&uf=AL`),
        fetch(`${baseUrl}/api/v1/emendas?ano=2025&uf=MG`),
        fetch(`${baseUrl}/api/v1/emendas?ano=2025&uf=ZZ`),
      ]);
    const [alagoas, minasGerais, ufSemEvidencia] = await Promise.all([
      alagoasResponse.json(),
      minasGeraisResponse.json(),
      ufSemEvidenciaResponse.json(),
    ]);

    expect(alagoasResponse.status).toBe(200);
    expect(alagoas.data.length).toBeGreaterThan(0);
    expect(alagoas.data).toContainEqual(
      expect.objectContaining({ code: "202529730007" })
    );
    expect(alagoas.meta.coverage).toContain("vínculo territorial documental");
    expect(minasGeraisResponse.status).toBe(200);
    expect(minasGerais.data.length).toBeGreaterThan(0);
    expect(ufSemEvidenciaResponse.status).toBe(200);
    expect(ufSemEvidencia.data).toEqual([]);
  });

  it("recusa parâmetros de filtro inválidos", async () => {
    const response = await fetch(
      `${baseUrl}/api/v1/emendas?ano=2025&status=entregue`
    );
    expect(response.status).toBe(400);
  });

  it("não encaminha UF à CGU quando não existe carga persistida para o ano", async () => {
    const response = await fetch(`${baseUrl}/api/v1/emendas?ano=2019&uf=SP`);
    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error).toContain("carga persistida");
  });

  it("aplica autoria e função orçamentária aos registros oficiais persistidos", async () => {
    const response = await fetch(
      `${baseUrl}/api/v1/emendas?ano=2025&autor=GENERAL%20GIRAO&funcao=Defesa%20nacional`
    );
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.meta).toMatchObject({
      author: "GENERAL GIRAO",
      budgetFunction: "Defesa nacional",
    });
    expect(payload.data.length).toBeGreaterThan(0);
    expect(payload.data).toContainEqual(
      expect.objectContaining({
        code: "202539940017",
        author: "GENERAL GIRAO",
        budgetFunction: "Defesa nacional",
      })
    );
    expect(
      payload.data.every(
        (record: { author: string | null; budgetFunction: string | null }) =>
          record.author === "GENERAL GIRAO" &&
          record.budgetFunction === "Defesa nacional"
      )
    ).toBe(true);
  });

  it("pagina a carga oficial persistida sem repetir os registros da primeira página", async () => {
    const [firstResponse, repeatedFirstResponse, secondResponse] =
      await Promise.all([
        fetch(`${baseUrl}/api/v1/emendas?ano=2025&pagina=1`),
        fetch(`${baseUrl}/api/v1/emendas?ano=2025&pagina=1`),
        fetch(`${baseUrl}/api/v1/emendas?ano=2025&pagina=2`),
      ]);
    const [firstPage, repeatedFirstPage, secondPage] = await Promise.all([
      firstResponse.json(),
      repeatedFirstResponse.json(),
      secondResponse.json(),
    ]);
    const firstCodes = new Set(
      firstPage.data.map((record: { code: string }) => record.code)
    );
    expect(firstResponse.status).toBe(200);
    expect(repeatedFirstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(firstPage.meta.page).toBe(1);
    expect(secondPage.meta.page).toBe(2);
    expect(firstPage.data.length).toBeGreaterThan(0);
    expect(secondPage.data.length).toBeGreaterThan(0);
    expect(
      firstPage.data.map((record: { code: string }) => record.code)
    ).toEqual(
      repeatedFirstPage.data.map((record: { code: string }) => record.code)
    );
    expect(
      firstPage.data.map((record: { code: string }) => record.code)
    ).toEqual(
      [...firstCodes].sort((left, right) => left.localeCompare(right, "pt-BR"))
    );
    expect(
      secondPage.data.some((record: { code: string }) =>
        firstCodes.has(record.code)
      )
    ).toBe(false);
  });
});
