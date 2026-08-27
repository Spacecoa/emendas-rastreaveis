import { describe, expect, it } from "vitest";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";

describe("isolamento de sessão", () => {
  it("aceita a sessão assinada para esta aplicação", async () => {
    const token = await sdk.signSession(
      { openId: "session-test", appId: ENV.appId, name: "Teste" },
      { expiresInMs: 60_000 }
    );

    await expect(sdk.verifySession(token)).resolves.toMatchObject({
      openId: "session-test",
      appId: ENV.appId,
    });
  });

  it("rejeita token assinado que declara outra aplicação", async () => {
    const token = await sdk.signSession(
      {
        openId: "session-test",
        appId: `${ENV.appId}-outra-aplicacao`,
        name: "Teste",
      },
      { expiresInMs: 60_000 }
    );

    await expect(sdk.verifySession(token)).resolves.toBeNull();
  });
});
