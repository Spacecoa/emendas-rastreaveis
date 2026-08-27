import { describe, expect, it } from "vitest";
import {
  containsLikePattern,
  escapeLikeLiteral,
  startsWithLikePattern,
} from "./querySafety";

describe("segurança de filtros LIKE", () => {
  it("trata caracteres curingas como texto literal", () => {
    expect(escapeLikeLiteral("100%_\\")).toBe("100\\%\\_\\\\");
    expect(containsLikePattern("100%_")).toBe("%100\\%\\_%");
    expect(startsWithLikePattern("12%_")).toBe("12\\%\\_%");
  });
});
