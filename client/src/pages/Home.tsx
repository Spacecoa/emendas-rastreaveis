import {
  ArrowRight,
  CircleCheckBig,
  FileCheck2,
  Landmark,
  Search,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { Link } from "wouter";
import PortalLayout from "@/components/PortalLayout";
import SearchPanel from "@/components/SearchPanel";
import { formatDate } from "@/lib/format";
import { trpc } from "@/lib/trpc";

const steps = [
  {
    icon: Landmark,
    number: "01",
    title: "Veja o dinheiro reservado",
    text: "Empenho mostra que o governo separou o recurso e assumiu o compromisso de pagar.",
  },
  {
    icon: CircleCheckBig,
    number: "02",
    title: "Veja o dinheiro pago",
    text: "Pagamento mostra que o recurso saiu. Ele não prova, sozinho, que uma obra ou serviço foi entregue.",
  },
  {
    icon: FileCheck2,
    number: "03",
    title: "Confira a fonte",
    text: "Cada resultado preserva o link da fonte, a data em que foi obtido e os limites daquela informação.",
  },
];

const number = (value: number | null | undefined) =>
  value === null || value === undefined
    ? "Informação não disponível"
    : new Intl.NumberFormat("pt-BR").format(value);
const percent = (value: number | null | undefined) =>
  value === null || value === undefined
    ? "Informação não disponível"
    : new Intl.NumberFormat("pt-BR", {
        style: "percent",
        maximumFractionDigits: 2,
      }).format(value);

export default function Home() {
  const [stateOrder, setStateOrder] = useState<"alphabetical" | "population">(
    "alphabetical"
  );
  const sources = trpc.emendas.sources.useQuery(undefined, { retry: false });
  const coverage = trpc.emendas.coverage.useQuery(undefined, { retry: false });
  const portal = sources.data?.find(
    source => source.name === "Portal da Transparência (CGU)"
  );
  const states = useMemo(
    () =>
      [...(coverage.data?.availableStates ?? [])].sort((left, right) =>
        stateOrder === "alphabetical"
          ? left.uf.localeCompare(right.uf, "pt-BR")
          : (right.population ?? -1) - (left.population ?? -1) ||
            left.uf.localeCompare(right.uf, "pt-BR")
      ),
    [coverage.data?.availableStates, stateOrder]
  );

  return (
    <PortalLayout>
      <section className="hero-grid">
        <div className="container relative py-16 sm:py-24 lg:py-28">
          <div className="relative max-w-5xl">
            <div className="flex flex-wrap items-center gap-3">
              <p className="eyebrow">CONSULTA PÚBLICA DE EMENDAS</p>
              <span className="source-stamp">Dados oficiais verificáveis</span>
            </div>
            <h1 className="hero-title mt-6">
              Escolha uma pergunta.
              <br />
              <em>Confira a resposta na fonte.</em>
            </h1>
            <p className="hero-lede mt-7 max-w-2xl">
              Pesquise emendas, pessoas, municípios e valores. A plataforma
              mostra o que os dados dizem, de onde vieram e o que ainda não é
              possível concluir.
            </p>
          </div>

          <div className="relative mt-12 max-w-6xl">
            <SearchPanel />
          </div>

          <div className="relative mt-7 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-black/70">
            <span className="inline-flex items-center gap-2">
              <span
                className={`size-2.5 rounded-full ${portal?.status === "available" ? "bg-[#075d78]" : "bg-[#8c989b]"}`}
                aria-hidden="true"
              />
              Dados financeiros: Portal da Transparência (CGU)
              {portal
                ? ` · obtidos em ${formatDate(portal.latestSuccessfulLoadAt)}`
                : " · consulte a cobertura"}
            </span>
            <Link
              className="inline-flex items-center gap-2 font-bold text-[#063c52] underline decoration-[#b76d16] decoration-2 underline-offset-4"
              href="/metodologia"
            >
              Como ler os dados <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section
        className="container py-12 sm:py-16"
        aria-labelledby="antes-de-concluir"
      >
        <div className="notice-panel grid gap-5 p-6 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-8">
          <div className="grid size-11 place-items-center rounded-full bg-[#063c52] text-white">
            <FileCheck2 size={21} aria-hidden="true" />
          </div>
          <div>
            <p className="section-kicker">LEIA ANTES DE CONCLUIR</p>
            <h2 id="antes-de-concluir" className="mt-2 text-2xl sm:text-3xl">
              Dinheiro pago não é prova de entrega.
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-black/72">
              Os valores mostram as etapas financeiras. Para afirmar que algo
              foi entregue, seriam necessários documentos oficiais adicionais.
            </p>
          </div>
          <Link
            className="action-link w-fit text-sm"
            href="/metodologia#semaforo"
          >
            Entender os limites <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section
        className="container pb-16 sm:pb-20"
        aria-labelledby="cobertura-titulo"
      >
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="eyebrow">O QUE JÁ ESTÁ DISPONÍVEL</p>
            <h2 id="cobertura-titulo" className="mt-3 text-4xl sm:text-5xl">
              O que está disponível hoje.
            </h2>
            <p className="page-intro mt-5 max-w-3xl">
              Estes totais vêm de registros oficiais já carregados. Eles não
              representam tudo o que existe no país e não comprovam entrega.
            </p>
          </div>
          <Link className="action-link w-fit text-sm" href="/cobertura">
            Ver dados e fontes <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        {coverage.isLoading ? (
          <p className="mt-8 rounded-md border border-[#d6d0c4] bg-[#fffdf8] p-5 text-sm text-black/70">
            Carregando os dados disponíveis…
          </p>
        ) : coverage.data ? (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="metric-card">
                <p>Emendas financeiras</p>
                <strong>{number(coverage.data.totals.amendments)}</strong>
                <span>CGU · exercício {coverage.data.referenceYear}</span>
              </div>
              <div className="metric-card">
                <p>Etapas do dinheiro</p>
                <strong>{number(coverage.data.totals.financialStages)}</strong>
                <span>dinheiro reservado, reconhecido, pago e pendente</span>
              </div>
              <div className="metric-card">
                <p>Municípios com população</p>
                <strong>{number(coverage.data.totals.municipalities)}</strong>
                <span>
                  IBGE · referência{" "}
                  {coverage.data.availableStates[0]?.populationReferenceYear ??
                    "não disponível"}
                </span>
              </div>
              <div className="metric-card">
                <p>Beneficiários registrados</p>
                <strong>{number(coverage.data.totals.beneficiaries)}</strong>
                <span>catálogo oficial do Transferegov</span>
              </div>
              <div className="metric-card">
                <p>Objetos e documentos</p>
                <strong>
                  {number(
                    coverage.data.totals.objects +
                      coverage.data.totals.instruments
                  )}
                </strong>
                <span>
                  {number(coverage.data.totals.objects)} objetos ·{" "}
                  {number(coverage.data.totals.instruments)} documentos
                </span>
              </div>
              <div className="metric-card">
                <p>Registros ligados entre duas bases</p>
                <strong>
                  {coverage.data.reconciliation
                    ? `${coverage.data.reconciliation.matched}/${coverage.data.reconciliation.evaluated}`
                    : "Informação não disponível"}
                </strong>
                <span>
                  {coverage.data.reconciliation
                    ? `${percent(coverage.data.reconciliation.matchRate)} por código igual`
                    : "aguardando comparação"}
                </span>
              </div>
            </div>
            <p className="limit-panel mt-5 max-w-5xl p-4 text-sm leading-6">
              <strong>O que essa comparação quer dizer:</strong> quando duas
              bases oficiais têm o mesmo código, mostramos esse vínculo. Em
              2025, a comparação usa os oito últimos dígitos do código CGU e o
              campo <code>NR_EMENDA</code> do Transferegov. Isso não confirma a
              entrega de obra ou serviço.
            </p>
          </>
        ) : (
          <p className="mt-8 rounded-md border border-[#d6d0c4] bg-[#fffdf8] p-5 text-sm text-black/70">
            A síntese de cobertura não está disponível neste momento.
          </p>
        )}
      </section>

      <section
        className="border-y border-[#d6d0c4] bg-[#e9f3f5]"
        aria-labelledby="ufs-titulo"
      >
        <div className="container py-16 sm:py-20">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <p className="eyebrow">COMECE PELO SEU ESTADO</p>
              <h2 id="ufs-titulo" className="mt-3 text-4xl sm:text-5xl">
                Estados com dados para consultar.
              </h2>
              <p className="page-intro mt-5 max-w-3xl">
                Escolha um estado para ver emendas que têm vínculo territorial
                comprovado por documento ou código oficial. A plataforma não
                decide o estado apenas pelo texto.
              </p>
            </div>
            <div
              className="flex w-fit rounded-md border border-[#142230] bg-[#fffdf8] p-1"
              role="group"
              aria-label="Ordenar unidades federativas"
            >
              <button
                type="button"
                className={`rounded px-4 py-2 text-sm font-bold ${stateOrder === "alphabetical" ? "bg-[#142230] text-white" : "text-[#142230]"}`}
                aria-pressed={stateOrder === "alphabetical"}
                onClick={() => setStateOrder("alphabetical")}
              >
                A–Z
              </button>
              <button
                type="button"
                className={`rounded px-4 py-2 text-sm font-bold ${stateOrder === "population" ? "bg-[#142230] text-white" : "text-[#142230]"}`}
                aria-pressed={stateOrder === "population"}
                onClick={() => setStateOrder("population")}
              >
                População
              </button>
            </div>
          </div>

          <ul className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {states.map(state => (
              <li key={state.uf}>
                <Link
                  href={`/busca?ano=${coverage.data?.referenceYear ?? 2025}&uf=${state.uf}`}
                  className="group block border border-[#b8c6c8] bg-[#fffdf8] p-5 transition hover:-translate-y-0.5 hover:border-[#075d78] hover:bg-white focus:outline-none"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-xs font-bold text-[#075d78]">
                        UF · {state.uf}
                      </p>
                      <p className="mt-2 text-xl font-bold text-[#142230]">
                        {number(state.municipalityCount)} municípios
                      </p>
                    </div>
                    <span className="evidence-chip">Ver emendas</span>
                  </div>
                  <p className="mt-6 border-t border-[#d6d0c4] pt-4 text-sm font-bold tabular-nums text-[#142230]">
                    {number(state.population)} habitantes
                  </p>
                  <p className="mt-1 text-xs leading-5 text-black/65">
                    População IBGE de{" "}
                    {state.populationReferenceYear ?? "ano não informado"} ·
                    dados obtidos em {formatDate(state.updatedAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          {!coverage.isLoading && states.length === 0 && (
            <p className="mt-8 rounded-md border border-[#d6d0c4] bg-[#fffdf8] p-5 text-sm text-black/70">
              Nenhum estado tem cobertura municipal suficiente para este acesso
              rápido.
            </p>
          )}
        </div>
      </section>

      <section className="container py-16 sm:py-20" aria-labelledby="como-usar">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,.8fr)_minmax(0,2fr)] lg:items-start">
          <div>
            <p className="eyebrow">UM JEITO SEGURO DE LER</p>
            <h2 id="como-usar" className="mt-3 text-4xl sm:text-5xl">
              Três passos para entender uma emenda.
            </h2>
            <p className="page-intro mt-5 max-w-md">
              Você não precisa conhecer termos de orçamento. A página explica o
              significado de cada etapa antes de apresentar uma conclusão.
            </p>
          </div>
          <ol className="grid gap-4 md:grid-cols-3">
            {steps.map(step => (
              <li key={step.title} className="method-card">
                <div className="flex items-center justify-between gap-4">
                  <step.icon
                    size={23}
                    className="text-[#075d78]"
                    aria-hidden="true"
                  />
                  <span className="font-mono text-xs font-bold text-[#b76d16]">
                    PASSO {step.number}
                  </span>
                </div>
                <h3 className="mt-8 text-lg font-bold">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-black/70">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </PortalLayout>
  );
}
