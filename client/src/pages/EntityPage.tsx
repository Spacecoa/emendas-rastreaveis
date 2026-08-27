import { Loader2, MapPinned } from "lucide-react";
import React from "react";
import { useLocation } from "wouter";
import PortalLayout, { CompactSearchLink } from "@/components/PortalLayout";
import ExecutionBars from "@/components/ExecutionBars";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { trpc } from "@/lib/trpc";

function entityFromPath(path: string) {
  return decodeURIComponent(path.split("?")[0].split("/").at(-1) ?? "");
}

export default function EntityPage({
  type,
}: {
  type: "municipio" | "parlamentar";
}) {
  const [location] = useLocation();
  const term = entityFromPath(location);
  const params = new URLSearchParams(location.split("?")[1] ?? "");
  const year = Number(params.get("ano") ?? 2025);
  const search = trpc.emendas.search.useQuery(
    { query: term, year, page: 1 },
    { retry: false }
  );
  const perCapita = trpc.emendas.municipalityPerCapita.useQuery(
    { municipality: term, year },
    { enabled: type === "municipio", retry: false }
  );
  const municipalityRecords = trpc.emendas.municipalityAmendments.useQuery(
    { municipality: term, year },
    { enabled: type === "municipio", retry: false }
  );
  const records = search.data?.records ?? [];
  const shown =
    type === "municipio"
      ? (municipalityRecords.data ?? [])
      : records.filter(record =>
          record.author
            ?.toLocaleLowerCase("pt-BR")
            .includes(term.toLocaleLowerCase("pt-BR"))
        );
  const committed = shown.reduce(
    (sum, record) => sum + (record.committed ?? 0),
    0
  );
  const paid = shown.reduce((sum, record) => sum + (record.paid ?? 0), 0);
  const title = type === "municipio" ? "Município" : "Parlamentar";

  return (
    <PortalLayout>
      <div className="container py-12 sm:py-20">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="eyebrow">
              {title.toUpperCase()} · {year}
            </p>
            <h1 className="mt-4 text-5xl sm:text-6xl">{term}</h1>
            <p className="page-intro mt-6 max-w-3xl">
              Esta página junta os resultados desta consulta oficial. Para um
              município, o valor por morador só aparece quando cada emenda tem
              código do IBGE, população oficial do mesmo ano e valor pago
              publicado.
            </p>
          </div>
          <CompactSearchLink />
        </div>
        {search.isLoading ||
        (type === "municipio" && municipalityRecords.isLoading) ? (
          <div className="content-card mt-10 flex items-center gap-3 p-8">
            <Loader2 className="animate-spin text-[#1e4a77]" /> Procurando nos
            dados oficiais…
          </div>
        ) : (
          <>
            {shown.length === 0 ? (
              <section className="content-card mt-10 p-8">
                <h2 className="text-xl font-bold">
                  Não encontramos resultados para esta busca.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-black/65">
                  A página não troca este município ou parlamentar por outro
                  parecido. Use a busca para mudar o nome, o ano ou os filtros.
                </p>
                <div className="mt-6">
                  <CompactSearchLink />
                </div>
              </section>
            ) : (
              <>
                {shown[0] && (
                  <div className="notice-panel mt-7 flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
                    <span>
                      <strong>Fonte do recorte:</strong> {shown[0].source} ·
                      extraído em {formatDate(shown[0].extractedAt)}
                    </span>
                    <a
                      className="font-bold underline underline-offset-4"
                      href={shown[0].sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir consulta oficial
                    </a>
                  </div>
                )}
                <section
                  className={`mt-10 grid gap-4 ${type === "municipio" ? "md:grid-cols-4" : "md:grid-cols-3"}`}
                >
                  <article className="metric-card">
                    <p>Registros no recorte</p>
                    <strong>{shown.length}</strong>
                    <span>encontrados nesta busca</span>
                  </article>
                  <article className="metric-card">
                    <p>Empenhado</p>
                    <strong>{formatCurrency(committed)}</strong>
                    <span>dinheiro reservado</span>
                  </article>
                  <article className="metric-card">
                    <p>Pago</p>
                    <strong>{formatCurrency(paid)}</strong>
                    <span>
                      {formatPercent(paid, committed)} do dinheiro reservado
                    </span>
                  </article>
                  {type === "municipio" && (
                    <article className="metric-card">
                      <p>Dinheiro pago por morador</p>
                      <strong>
                        {perCapita.data?.perCapitaPaid === null ||
                        perCapita.data?.perCapitaPaid === undefined
                          ? "Informação não disponível"
                          : formatCurrency(perCapita.data.perCapitaPaid)}
                      </strong>
                      <span>
                        {perCapita.data?.status === "eligible"
                          ? `${perCapita.data.linkedAmendments} emendas com código IBGE e população de 2025.`
                          : (perCapita.data?.reason ??
                            "Verificando vínculo municipal e população oficial.")}
                      </span>
                    </article>
                  )}
                </section>
                <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
                  <ExecutionBars
                    values={{
                      committed,
                      settled: shown.reduce(
                        (sum, record) => sum + (record.settled ?? 0),
                        0
                      ),
                      paid,
                    }}
                  />
                  <section className="content-card border-dashed bg-[#f1ede4] p-6">
                    <MapPinned className="text-[#1e4a77]" />
                    <h2 className="mt-5 font-bold tracking-[-.03em]">
                      {perCapita.data?.status === "eligible"
                        ? "Dinheiro pago por morador neste município"
                        : "Valor por morador não disponível nesta busca"}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-black/65">
                      {perCapita.data?.status === "eligible"
                        ? `A soma de ${formatCurrency(perCapita.data.paid)} em pagamentos oficiais de ${perCapita.data.linkedAmendments} emendas com código IBGE foi dividida pela população de ${perCapita.data.population?.toLocaleString("pt-BR")} habitantes em ${perCapita.data.populationReferenceYear}. Pagamento não comprova entrega física.`
                        : (perCapita.data?.reason ??
                          "Não fazemos estimativas. Sem vínculo com o município, população oficial do mesmo ano ou valor pago publicado, não mostramos esse cálculo.")}
                    </p>
                    {perCapita.data?.status === "eligible" && (
                      <p className="mt-4 text-xs leading-5 text-black/60">
                        <a
                          className="font-bold underline underline-offset-4"
                          href={perCapita.data.financialSourceUrl ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Fonte financeira CGU
                        </a>{" "}
                        ·{" "}
                        <a
                          className="font-bold underline underline-offset-4"
                          href={perCapita.data.populationSourceUrl ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                        >
                          População IBGE/
                          {perCapita.data.populationReferenceYear}
                        </a>
                      </p>
                    )}
                  </section>
                </div>
                <section className="content-card mt-6 p-6">
                  <p className="eyebrow">CAMINHO DO DINHEIRO</p>
                  <h2 className="mt-2 text-xl font-black tracking-[-.04em]">
                    Valores pagos não comprovam, por si só, a entrega.
                  </h2>
                  <ol className="mt-6 grid gap-4 md:grid-cols-3">
                    <li className="border-l-4 border-[#1e4a77] pl-4">
                      <p className="text-xs font-bold uppercase tracking-[.08em] text-[#1e4a77]">
                        Empenho
                      </p>
                      <p className="mt-2 text-lg font-black">
                        {formatCurrency(committed)}
                      </p>
                      <p className="mt-1 text-sm text-black/65">
                        Dinheiro reservado e compromisso de pagamento nesta
                        busca.
                      </p>
                    </li>
                    <li className="border-l-4 border-[#76a9d1] pl-4">
                      <p className="text-xs font-bold uppercase tracking-[.08em] text-[#1e4a77]">
                        Liquidação
                      </p>
                      <p className="mt-2 text-lg font-black">
                        {formatCurrency(
                          shown.reduce(
                            (sum, record) => sum + (record.settled ?? 0),
                            0
                          )
                        )}
                      </p>
                      <p className="mt-1 text-sm text-black/65">
                        Etapa reconhecida pela fonte como apta para pagamento.
                      </p>
                    </li>
                    <li className="border-l-4 border-[#d58e9d] pl-4">
                      <p className="text-xs font-bold uppercase tracking-[.08em] text-[#822437]">
                        Pagamento
                      </p>
                      <p className="mt-2 text-lg font-black">
                        {formatCurrency(paid)}
                      </p>
                      <p className="mt-1 text-sm text-black/65">
                        Pagamento não confirma, sozinho, a entrega do objeto.
                      </p>
                    </li>
                  </ol>
                </section>
                <section className="content-card mt-8 overflow-hidden">
                  <div className="border-b border-black/10 px-6 py-5">
                    <h2 className="font-bold tracking-[-.03em]">
                      Emendas no recorte
                    </h2>
                    <p className="mt-1 text-sm text-black/60">
                      Selecione uma emenda para ver os valores, documentos e o
                      que os dados ainda não permitem afirmar.
                    </p>
                  </div>
                  <div className="divide-y divide-black/5">
                    {shown.map(record => (
                      <a
                        href={`/emendas/${record.code}?ano=${record.year ?? year}`}
                        key={record.code}
                        className="block px-6 py-5 transition hover:bg-[#f6f9fb] focus:bg-[#f6f9fb] focus:outline-none"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <p className="font-bold">
                              Emenda {record.number ?? record.code}
                            </p>
                            <p className="mt-1 text-sm text-black/60">
                              {record.budgetFunction ?? "Área não informada"} ·{" "}
                              {record.locality ?? "Localidade não informada"}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-4">
                            <strong className="text-sm tabular-nums">
                              {formatCurrency(record.paid)}
                            </strong>
                            <StatusBadge
                              status={record.complianceStatus}
                              linked={false}
                            />
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </PortalLayout>
  );
}
