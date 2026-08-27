import PortalLayout, { CompactSearchLink } from "@/components/PortalLayout";
import { Button } from "@/components/ui/button";
import {
  Bot,
  Database,
  Loader2,
  MessageCircleQuestion,
  Send,
  ShieldCheck,
  User,
} from "lucide-react";
import React, { useState } from "react";
import { trpc } from "@/lib/trpc";

const suggestedPrompts = [
  "Quantas emendas de 2022 estão carregadas?",
  "Quantas emendas de 2025 estão carregadas?",
  "O que quer dizer quando duas bases têm o mesmo código?",
  "O que há sobre a emenda 202529240019?",
];

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  dataScope?: string;
  sources?: Array<{ label: string; url: string }>;
};

export default function PublicChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const chat = trpc.chat.ask.useMutation({
    onSuccess: response => {
      setMessages(current => [
        ...current,
        {
          role: "assistant",
          content: response.answer,
          dataScope: response.dataScope,
          sources: response.sources,
        },
      ]);
    },
    onError: failure => {
      setError(
        failure.message ||
          "Não foi possível consultar os dados agora. Tente novamente em instantes."
      );
    },
  });

  const sendMessage = (content: string) => {
    const question = content.trim();
    if (!question || chat.isPending) return;
    setError(null);
    const history = messages.slice(-6).map(message => ({
      role:
        message.role === "assistant"
          ? ("assistant" as const)
          : ("user" as const),
      content: message.content.slice(0, 600),
    }));
    setMessages(current => [...current, { role: "user", content: question }]);
    chat.mutate({ question, history });
    setInput("");
  };

  return (
    <PortalLayout>
      <div className="container py-12 sm:py-16">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <p className="eyebrow">PERGUNTE EM LINGUAGEM SIMPLES</p>
              <span className="source-stamp">Resposta com fontes</span>
            </div>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] sm:text-5xl">
              Pergunte sobre as emendas.
              <br />
              Veja de onde vem a resposta.
            </h1>
            <p className="mt-4 border-l-2 border-[#1e4a77]/35 pl-5 leading-7 text-black/65">
              Faça uma pergunta como faria a uma pessoa. O assistente procura
              apenas nos dados oficiais já disponíveis, mostra as fontes e avisa
              quando não há informação suficiente.
            </p>
          </div>
          <CompactSearchLink />
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
          <section aria-labelledby="chat-title">
            <h2 id="chat-title" className="sr-only">
              Conversa com os dados públicos
            </h2>
            <div className="flex min-h-[32rem] flex-col overflow-hidden rounded-[1.4rem] border border-black/10 bg-white shadow-[0_8px_30px_rgba(18,25,32,.05)]">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                {messages.length === 0 ? (
                  <div className="flex min-h-80 flex-col items-center justify-center text-center">
                    <span className="grid size-12 place-items-center rounded-full bg-[#edf4fb] text-[#1e4a77]">
                      <Bot size={23} aria-hidden="true" />
                    </span>
                    <p className="mt-4 max-w-md text-sm leading-6 text-black/65">
                      Faça uma pergunta sobre os dados já disponíveis. Comece
                      por um ano, uma pessoa, um município ou o número da
                      emenda.
                    </p>
                    <div className="mt-6 flex max-w-xl flex-wrap justify-center gap-2">
                      {suggestedPrompts.map(prompt => (
                        <button
                          key={prompt}
                          type="button"
                          disabled={chat.isPending}
                          onClick={() => sendMessage(prompt)}
                          className="rounded-xl border border-black/10 bg-[#faf9f6] px-3 py-2 text-sm leading-5 transition hover:border-[#1e4a77]/40 hover:bg-[#edf4fb] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <ol className="space-y-5" aria-live="polite">
                    {messages.map((message, index) => (
                      <li
                        key={`${message.role}-${index}`}
                        className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {message.role === "assistant" && (
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#edf4fb] text-[#1e4a77]">
                            <Bot size={16} aria-hidden="true" />
                          </span>
                        )}
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "bg-[#16191d] text-white" : "bg-[#f4f5f4] text-black/80"}`}
                        >
                          <p className="whitespace-pre-wrap">
                            {message.content}
                          </p>
                          {message.dataScope && (
                            <p className="mt-3 border-t border-black/10 pt-3 text-xs leading-5 text-black/60">
                              {message.dataScope}
                            </p>
                          )}
                          {message.sources && message.sources.length > 0 && (
                            <ul className="mt-3 border-t border-black/10 pt-3 text-xs leading-5">
                              <li className="font-bold">Fontes do contexto</li>
                              {message.sources.map(source => (
                                <li key={source.url}>
                                  <a
                                    className="underline decoration-black/30 underline-offset-4 hover:text-[#1e4a77]"
                                    href={source.url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {source.label}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        {message.role === "user" && (
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#16191d] text-white">
                            <User size={16} aria-hidden="true" />
                          </span>
                        )}
                      </li>
                    ))}
                    {chat.isPending && (
                      <li className="flex items-center gap-3 text-sm text-black/60">
                        <span className="grid size-8 place-items-center rounded-full bg-[#edf4fb] text-[#1e4a77]">
                          <Loader2
                            className="animate-spin"
                            size={16}
                            aria-hidden="true"
                          />
                        </span>
                        Buscando nos dados oficiais…
                      </li>
                    )}
                  </ol>
                )}
              </div>
              <form
                className="flex items-end gap-3 border-t border-black/10 bg-[#faf9f6] p-4"
                onSubmit={event => {
                  event.preventDefault();
                  sendMessage(input);
                }}
              >
                <label className="sr-only" htmlFor="pergunta-chat">
                  Pergunta sobre os dados públicos
                </label>
                <textarea
                  id="pergunta-chat"
                  value={input}
                  onChange={event => setInput(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage(input);
                    }
                  }}
                  disabled={chat.isPending}
                  maxLength={600}
                  rows={2}
                  placeholder="Ex.: Quantas emendas de 2024 estão aqui?"
                  className="min-h-11 flex-1 resize-none rounded-xl border border-black/15 bg-white px-3 py-2 text-sm leading-5 outline-none transition focus:border-[#1e4a77] focus:ring-4 focus:ring-[#1e4a77]/15 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || chat.isPending}
                  aria-label="Enviar pergunta"
                  className="size-11 shrink-0"
                >
                  {chat.isPending ? (
                    <Loader2
                      className="animate-spin"
                      size={18}
                      aria-hidden="true"
                    />
                  ) : (
                    <Send size={18} aria-hidden="true" />
                  )}
                </Button>
              </form>
            </div>
            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-[#c47887]/40 bg-[#f9ecee] px-4 py-3 text-sm leading-6 text-[#6e1c2c]"
              >
                {error}
              </p>
            )}
            {messages.length > 0 && (
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setMessages([]);
                  setError(null);
                }}
              >
                Limpar conversa local
              </Button>
            )}
          </section>

          <aside className="space-y-4" aria-label="Como o chat usa os dados">
            <section className="rounded-[1.4rem] bg-[#edf4fb] p-6">
              <Database className="text-[#1e4a77]" aria-hidden="true" />
              <h2 className="mt-4 font-black tracking-[-.03em]">
                Quais dados ele usa
              </h2>
              <p className="mt-2 text-sm leading-6 text-black/70">
                Dados financeiros da CGU de 2022 a 2025, informações sobre a
                cobertura e comparação de códigos com o Transferegov em 2025.
              </p>
            </section>
            <section className="rounded-[1.4rem] border border-black/10 bg-white p-6">
              <ShieldCheck className="text-[#1e4a77]" aria-hidden="true" />
              <h2 className="mt-4 font-black tracking-[-.03em]">
                O que ele não pode afirmar
              </h2>
              <p className="mt-2 text-sm leading-6 text-black/70">
                Pagamento não prova que algo foi entregue. Encontrar o mesmo
                código em duas bases também não prova isso. Quando faltam dados,
                ele informa que não sabe em vez de estimar.
              </p>
            </section>
            <section className="rounded-[1.4rem] border border-dashed border-black/20 bg-[#f8f9fa] p-6">
              <MessageCircleQuestion
                className="text-[#1e4a77]"
                aria-hidden="true"
              />
              <h2 className="mt-4 font-black tracking-[-.03em]">
                Por onde começar
              </h2>
              <p className="mt-2 text-sm leading-6 text-black/70">
                Pergunte por número de emenda, quem indicou, valores pagos,
                dados de 2022 a 2025 ou fontes. Para escolher vários filtros e
                baixar os dados, use a busca.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </PortalLayout>
  );
}
