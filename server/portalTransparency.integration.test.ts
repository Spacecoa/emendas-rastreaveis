import { describe, expect, it } from "vitest";

const API_URL = "https://api.portaldatransparencia.gov.br/api-de-dados/emendas?ano=2025&pagina=1";

describe("Portal da Transparência", () => {
  it("autentica uma consulta mínima de emendas sem expor a credencial", async () => {
    const apiKey = process.env.PORTAL_TRANSPARENCIA_API_KEY;

    expect(apiKey, "A credencial PORTAL_TRANSPARENCIA_API_KEY deve estar configurada").toBeTruthy();

    const response = await fetch(API_URL, {
      headers: {
        "chave-api-dados": apiKey as string,
        Accept: "application/json",
      },
    });

    expect(response.status, "A API deve aceitar a chave configurada").not.toBe(401);
    expect(response.status, "A API deve aceitar a chave configurada").not.toBe(403);
    expect(response.ok, "A consulta mínima à fonte oficial deve responder com sucesso").toBe(true);
  }, 20_000);
});
