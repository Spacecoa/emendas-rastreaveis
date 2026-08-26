// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import MethodologyPage from "../client/src/pages/MethodologyPage";

describe("acessibilidade da metodologia", () => {
  it("expõe regras do semáforo e limitações de dados sem violações axe", async () => {
    const { container } = render(<MethodologyPage />);
    expect(
      screen.getByRole("heading", {
        name: "A cor não é o dado. A regra é o dado.",
      })
    ).toBeTruthy();
    expect(screen.getByText("LIMITAÇÕES ATUAIS")).toBeTruthy();
    expect(
      screen.getByText(
        /carga financeira nacional de emendas da CGU de 2022 a 2025/
      )
    ).toBeTruthy();
    expect(screen.getByText(/4\.710 de 6\.311 chaves CGU/)).toBeTruthy();
    expect(
      screen.queryByText(/amostra parcial de execução financeira da CGU/)
    ).toBeNull();
    const result = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });
});
