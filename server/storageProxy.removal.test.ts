import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const serverRoot = fileURLToPath(new URL(".", import.meta.url));

describe("remoção do proxy público de armazenamento", () => {
  it("não mantém a rota anônima de links assinados registrada", () => {
    const serverEntry = readFileSync(
      new URL("./_core/index.ts", import.meta.url),
      "utf8"
    );
    const storageHelper = readFileSync(
      new URL("./storage.ts", import.meta.url),
      "utf8"
    );

    expect(serverEntry).not.toContain("registerStorageProxy");
    expect(existsSync(`${serverRoot}_core/storageProxy.ts`)).toBe(false);
    expect(storageHelper).not.toContain("url: `/manus-storage/${key}`");
    expect(storageHelper).toContain("url: await storageGetSignedUrl(key)");
  });
});
