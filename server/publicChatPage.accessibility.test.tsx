// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    chat: {
      ask: {
        useMutation: (options: { onSuccess: (value: unknown) => void }) => ({
          isPending: false,
          mutate: () =>
            options.onSuccess({
              answer:
                "A carga financeira nacional de 2025 contém 6.311 emendas. Pagamento não comprova entrega física.",
              dataScope: "Resposta limitada à carga financeira CGU/2025.",
              sources: [
                {
                  label: "Portal da Transparência (CGU)",
                  url: "https://example.test/cgu",
                },
              ],
            }),
        }),
      },
    },
  },
}));

import PublicChatPage from "../client/src/pages/PublicChatPage";

describe("página pública de chat", () => {
  it("mantém a conversa acessível e apresenta fontes devolvidas pelo servidor", async () => {
    const { container } = render(<PublicChatPage />);

    expect(
      screen.getByRole("heading", {
        name: "Pergunte aos dados, com fonte e limite.",
      })
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Quantas emendas de 2025 estão carregadas?",
      })
    );

    expect(screen.getByText(/6.311 emendas/)).toBeTruthy();
    expect(
      screen
        .getAllByRole("link", { name: "Portal da Transparência (CGU)" })
        .some(link => link.getAttribute("href") === "https://example.test/cgu")
    ).toBe(true);
    expect(
      screen.getByText(/Pagamento não comprova entrega física/)
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Limpar conversa local" })
    ).toBeTruthy();

    const result = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });
});
