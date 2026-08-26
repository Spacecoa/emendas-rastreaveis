// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import NotFound from "../client/src/pages/NotFound";

describe("acessibilidade da página 404", () => {
  it("orienta a pessoa de volta à consulta pública sem violações axe", async () => {
    const { container } = render(<NotFound />);
    expect(screen.getByRole("heading", { name: "Este endereço não está disponível." })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ir para a consulta" }).getAttribute("href")).toBe("/busca");
    const result = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations).toEqual([]);
  });
});
