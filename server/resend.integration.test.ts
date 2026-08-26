import { describe, expect, it } from "vitest";

describe("integração Resend", () => {
  const fromEmail = process.env.ALERT_FROM_EMAIL;
  const configured = Boolean(fromEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail));
  const testWhenConfigured = configured ? it : it.skip;

  testWhenConfigured("aceita a credencial configurada em uma consulta sem efeitos colaterais", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    expect(apiKey, "RESEND_API_KEY deve estar configurada").toBeTruthy();
    expect(fromEmail, "ALERT_FROM_EMAIL deve estar configurada").toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });

    expect(response.ok, `A API de e-mail respondeu com status ${response.status}`).toBe(true);
  }, 20_000);
});
