// @vitest-environment jsdom
import React from "react";
import { render } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import ExecutionBars from "../client/src/components/ExecutionBars";

describe("acessibilidade da execução financeira", () => {
  it("não introduz violações axe na visualização com alternativa tabular", async () => {
    const { container } = render(<ExecutionBars values={{ committed: 1000, settled: 800, paid: 650 }} />);
    const result = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations).toEqual([]);
    expect(container.querySelector("table")).not.toBeNull();
  });
});
