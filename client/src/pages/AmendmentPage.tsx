import {
  ExternalLink,
  FileText,
  Loader2,
  MoveRight,
  ShieldCheck,
} from "lucide-react";
import React from "react";
import { useLocation } from "wouter";
import PortalLayout, { CompactSearchLink } from "@/components/PortalLayout";
import ExecutionBars from "@/components/ExecutionBars";
import { StatusBadge, statusDescription } from "@/components/StatusBadge";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { trpc } from "@/lib/trpc";

const stepNames = [
  [
    "Indicação / dotação",
    "Informação não disponível na fonte financeira inicial.",
  ],
  [
    "Empenho",
    "O governo reservou o dinheiro e assumiu o compromisso de pagar.",
  ],
  [
    "Liquidação",
    "O órgão reconheceu que recebeu o bem, serviço ou etapa que permite o pagamento.",
  ],
  [
    "Pagamento",
    "O recurso foi pago. Isso não confirma, sozinho, a entrega final do objeto.",
  ],
  [
    "Execução física",
    "A base possui conciliação documental parcial com o Transferegov em 2025, mas ela não basta para comprovar a entrega física desta emenda.",
  ],
  [
    "Prestação de contas",
    "Informação não disponível na fonte financeira inicial.",
  ],
];

export default function AmendmentPage() {
  const [location] = useLocation();
  const code = decodeURIComponent(
    location.split("?")[0].split("/").at(-1) ?? ""
  );
  const params = new URLSearchParams(location.split("?")[1] ?? "");
  const year = Number(params.get("ano") ?? 2025);
  const query = trpc.emendas.byCode.useQuery({ code, year }, { retry: false });
  const documents = trpc.emendas.documents.useQuery(
    { code },
    { enabled: Boolean(query.data), retry: false }
  );
  const record = query.data;

  return (
    <PortalLayout>
      <div className="container py-12 sm:py-16">
        {query.isLoading ? (
          <div className="flex items-center gap-3 rounded-2xl bg-white p-8">
            <Loader2 className="animate-spin text-[#1e4a77]" /> Procurando esta
            emenda nos dados oficiais…
          </div>
        ) : !record ? (
          <div className="rounded-[1.5rem] bg-white p-9">
            <h1 className="text-3xl font-black tracking-[-.05em]">
              Não encontramos esta emenda agora.
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-black/65">
              Tente usar a busca com outro ano, número ou nome. Quando não há
              resultado, a plataforma não cria uma resposta aproximada.
            </p>
            <div className="mt-6">
              <CompactSearchLink />
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <p className="eyebrow">
                  EMENDA {record.number ?? record.code} · {record.year ?? year}
                </p>
                <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-[-.06em] sm:text-5xl">
                  {record.author ?? "Autoria não informada"}
                </h1>
                <p className="mt-4 max-w-3xl border-l-2 border-[#1e4a77]/35 pl-5 text-lg leading-8 text-black/68">
                  Destinada a{" "}
                  <strong>
                    {record.locality ?? "localidade não informada"}
                  </strong>
                  , na área de atuação{" "}
                  <strong>{record.budgetFunction ?? "não informada"}</strong>. A
                  descrição do que será feito não aparece nesta fonte. Por isso,
                  não completamos essa informação.
                </p>
              </div>
              <div className="flex flex-col items-start gap-3">
                <StatusBadge status={record.complianceStatus} />
                <CompactSearchLink />
              </div>
            </div>
            <section className="mt-10 rounded-[1.5rem] border border-[#b6d6f0] bg-[#edf4fb] p-6 sm:p-8">
              <div className="flex gap-4">
                <ShieldCheck
                  className="mt-1 shrink-0 text-[#1e4a77]"
                  size={22}
                />
                <div>
                  <h2 className="font-bold tracking-[-.03em]">
                    O que a situação acima significa
                  </h2>
                  <p className="mt-2 max-w-3xl leading-7 text-black/70">
                    {statusDescription(record.complianceStatus)} Com os dados
                    financeiros atuais, não é correto concluir que a obra ou o
                    serviço foi entregue. Veja a regra completa na{" "}
                    <a
                      href="/metodologia#semaforo"
                      className="font-bold underline underline-offset-4"
                    >
                      metodologia
                    </a>
                    .
                  </p>
                </div>
              </div>
            </section>
            <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
              <ExecutionBars
                values={{
                  committed: record.committed,
                  settled: record.settled,
                  paid: record.paid,
                }}
                title="Execução financeira conhecida"
              />
              <aside className="rounded-[1.4rem] bg-white p-6 shadow-[0_8px_30px_rgba(18,25,32,.05)]">
                <h2 className="font-bold tracking-[-.03em]">Veja os valores</h2>
                <dl className="mt-5 space-y-4 text-sm">
                  <div className="flex justify-between gap-4 border-b border-black/8 pb-3">
                    <dt className="text-black/60">
                      Dinheiro pago em relação ao reservado
                    </dt>
                    <dd className="font-bold">
                      {formatPercent(record.paid, record.committed)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-black/8 pb-3">
                    <dt className="text-black/60">
                      Valores que ficaram pendentes
                    </dt>
                    <dd className="font-bold">
                      {formatCurrency(record.remainingRegistered)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-black/60">
                      Valores pendentes cancelados
                    </dt>
                    <dd className="font-bold">
                      {formatCurrency(record.remainingCancelled)}
                    </dd>
                  </div>
                </dl>
              </aside>
            </section>
            <section className="mt-8 rounded-[1.5rem] bg-white p-6 shadow-[0_8px_30px_rgba(18,25,32,.05)] sm:p-8">
              <div>
                <p className="eyebrow">CAMINHO DO DINHEIRO</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-.05em]">
                  Cada etapa conta uma parte da história.
                </h2>
              </div>
              <ol className="mt-8 grid gap-0 md:grid-cols-2 lg:grid-cols-3">
                {stepNames.map(([label, explanation], index) => {
                  const amount =
                    index === 1
                      ? record.committed
                      : index === 2
                        ? record.settled
                        : index === 3
                          ? record.paid
                          : null;
                  return (
                    <li
                      key={label}
                      className="relative border-l border-black/15 px-5 pb-8 last:pb-0 md:pb-10"
                    >
                      <span
                        className="absolute -left-[.34rem] top-0 size-3 rounded-full bg-[#1e4a77] ring-4 ring-white"
                        aria-hidden="true"
                      />
                      <p className="text-xs font-bold uppercase tracking-[.08em] text-[#1e4a77]">
                        Etapa {index + 1}
                      </p>
                      <h3 className="mt-2 font-bold">{label}</h3>
                      <p className="mt-2 text-sm leading-6 text-black/65">
                        {explanation}
                      </p>
                      <p className="mt-3 text-sm font-bold">
                        {formatCurrency(amount)}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </section>
            <section className="mt-8 grid gap-6 md:grid-cols-2">
              <article className="rounded-[1.4rem] bg-[#f9e4e8] p-6">
                <FileText className="text-[#822437]" />
                <h2 className="mt-5 font-bold tracking-[-.03em]">
                  Documentos relacionados
                </h2>
                {documents.isFetching ? (
                  <p className="mt-2 text-sm">Procurando documentos…</p>
                ) : documents.data?.items ? (
                  <p className="mt-2 text-sm leading-6">
                    A fonte encontrou documentos ligados a este registro. Eles
                    ainda precisam ser organizados para aparecerem em detalhe
                    nesta página.
                  </p>
                ) : (
                  <p className="mt-2 text-sm leading-6">
                    A fonte consultada não trouxe documentos ligados a este
                    registro.
                  </p>
                )}
              </article>
              <article className="rounded-[1.4rem] bg-[#f2f3f5] p-6">
                <ExternalLink className="text-[#1e4a77]" />
                <h2 className="mt-5 font-bold tracking-[-.03em]">
                  Origem do registro
                </h2>
                <p className="mt-2 text-sm leading-6">
                  Portal da Transparência (CGU), extraído em{" "}
                  {formatDate(record.extractedAt)}.
                </p>
                <a
                  href={record.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 font-bold underline underline-offset-4"
                >
                  Abrir consulta oficial <MoveRight size={16} />
                </a>
              </article>
            </section>
          </>
        )}
      </div>
    </PortalLayout>
  );
}
