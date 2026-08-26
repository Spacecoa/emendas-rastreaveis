import { ArrowDownRight, CircleDashed, FileCheck2, Landmark, Search } from "lucide-react";
import React, { useMemo, useState } from "react";
import { Link } from "wouter";
import PortalLayout from "@/components/PortalLayout";
import SearchPanel from "@/components/SearchPanel";
import { formatDate } from "@/lib/format";
import { trpc } from "@/lib/trpc";

const steps = [
  { icon: Landmark, title: "O dinheiro foi reservado?", text: "Mostramos as etapas de orçamento, empenho, liquidação e pagamento como fatos diferentes." },
  { icon: CircleDashed, title: "A entrega foi confirmada?", text: "A situação da obra ou do serviço só aparece como comprovada quando a fonte oficial permite verificar." },
  { icon: FileCheck2, title: "É possível auditar?", text: "Cada número preserva sua fonte, link, data de extração e limite de interpretação." },
];

const number = (value: number | null | undefined) => value === null || value === undefined ? "Informação não disponível" : new Intl.NumberFormat("pt-BR").format(value);
const percent = (value: number | null | undefined) => value === null || value === undefined ? "Informação não disponível" : new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 2 }).format(value);

export default function Home() {
  const [stateOrder, setStateOrder] = useState<"alphabetical" | "population">("alphabetical");
  const sources = trpc.emendas.sources.useQuery(undefined, { retry: false });
  const coverage = trpc.emendas.coverage.useQuery(undefined, { retry: false });
  const portal = sources.data?.find(source => source.name === "Portal da Transparência (CGU)");
  const states = useMemo(() => [...(coverage.data?.availableStates ?? [])].sort((left, right) => stateOrder === "alphabetical"
    ? left.uf.localeCompare(right.uf, "pt-BR")
    : (right.population ?? -1) - (left.population ?? -1) || left.uf.localeCompare(right.uf, "pt-BR")), [coverage.data?.availableStates, stateOrder]);

  return <PortalLayout>
    <section className="hero-grid overflow-hidden border-b border-black/10">
      <div className="container relative py-16 sm:py-24 lg:py-28">
        <div className="absolute -right-12 top-8 size-44 rounded-full bg-[#b6d6f0]/70 blur-[1px]" aria-hidden="true" />
        <div className="absolute bottom-0 right-[25%] size-24 rotate-12 rounded-[1.7rem] bg-[#edbdc7]/80" aria-hidden="true" />
        <div className="relative max-w-4xl">
          <p className="eyebrow">DINHEIRO PÚBLICO, LEITURA CLARA</p>
          <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[.92] tracking-[-0.07em] text-[#151a20] sm:text-6xl lg:text-7xl">Acompanhe a emenda <span className="font-light italic">até a entrega.</span></h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-black/70">Consulte o caminho de cada emenda parlamentar — da indicação ao pagamento — e veja, com honestidade, quando ainda faltam dados para provar o resultado no município.</p>
        </div>
        <div className="relative mt-10 max-w-5xl"><SearchPanel /></div>
        <div className="relative mt-7 flex flex-wrap gap-x-7 gap-y-3 text-sm text-black/65"><span className="inline-flex items-center gap-2"><span className={`size-2 rounded-full ${portal?.status === "available" ? "bg-[#1e4a77]" : "bg-black/35"}`} />Fonte financeira inicial: Portal da Transparência{portal ? ` · atualizada em ${formatDate(portal.latestSuccessfulLoadAt)}` : " · aguardando primeira carga"}</span><Link className="inline-flex items-center gap-1 font-semibold underline decoration-black/25 underline-offset-4" href="/metodologia">Como lemos os dados <ArrowDownRight size={15} /></Link></div>
      </div>
    </section>

    <section className="container py-16 sm:py-20" aria-labelledby="cobertura-titulo">
      <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">COBERTURA CONCRETA</p><h2 id="cobertura-titulo" className="mt-3 text-3xl font-black tracking-[-0.055em] sm:text-4xl">O que está disponível hoje.</h2><p className="mt-4 max-w-3xl leading-7 text-black/65">Estes totais vêm da carga oficial persistida. A cobertura atual é parcial e declarada: não representa o Brasil inteiro, nem prova entrega física.</p></div><Link className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-3 font-bold shadow-sm transition hover:bg-[#f9e4e8] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1e4a77]/35" href="/metodologia"><Search size={17} /> Ver metodologia</Link></div>
      {coverage.isLoading ? <p className="mt-8 text-sm text-black/60">Carregando a cobertura oficial…</p> : coverage.data ? <>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><div className="metric-card"><p>Emendas financeiras</p><strong>{number(coverage.data.totals.amendments)}</strong><span>CGU · exercício {coverage.data.referenceYear}</span></div><div className="metric-card"><p>Estágios financeiros</p><strong>{number(coverage.data.totals.financialStages)}</strong><span>empenho, liquidação, pagamento e restos</span></div><div className="metric-card"><p>Municípios com população</p><strong>{number(coverage.data.totals.municipalities)}</strong><span>IBGE · referência {coverage.data.availableStates[0]?.populationReferenceYear ?? "não disponível"}</span></div><div className="metric-card"><p>Beneficiários</p><strong>{number(coverage.data.totals.beneficiaries)}</strong><span>Transferegov · catálogo oficial</span></div><div className="metric-card"><p>Objetos e instrumentos</p><strong>{number(coverage.data.totals.objects + coverage.data.totals.instruments)}</strong><span>{number(coverage.data.totals.objects)} objetos · {number(coverage.data.totals.instruments)} instrumentos</span></div><div className="metric-card"><p>Chaves conciliadas</p><strong>{coverage.data.reconciliation ? `${coverage.data.reconciliation.matched}/${coverage.data.reconciliation.evaluated}` : "Informação não disponível"}</strong><span>{coverage.data.reconciliation ? `${percent(coverage.data.reconciliation.matchRate)} por NR_EMENDA` : "aguardando carga"}</span></div></div>
        <p className="mt-5 max-w-4xl text-sm leading-6 text-black/65">A taxa de conciliação usa igualdade exata entre os oito últimos dígitos do código CGU de 2025 e o campo oficial <code>NR_EMENDA</code> do Transferegov. Ela indica vínculo documental entre bases, não comprovação de execução física.</p>
      </> : <p className="mt-8 text-sm text-black/60">A síntese de cobertura não está disponível neste momento.</p>}
    </section>

    <section className="border-y border-black/10 bg-[#e9eff4]" aria-labelledby="ufs-titulo"><div className="container py-14"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">ACESSO RÁPIDO</p><h2 id="ufs-titulo" className="mt-3 text-3xl font-black tracking-[-0.055em] sm:text-4xl">UFs disponíveis.</h2><p className="mt-4 max-w-2xl leading-7 text-black/65">Apenas UFs com municípios e população oficial já carregados aparecem aqui. Escolha a ordenação por nome ou pela população de referência conhecida.</p></div><div className="flex rounded-full border border-black/15 bg-white p-1" role="group" aria-label="Ordenar unidades federativas"><button type="button" className={`rounded-full px-4 py-2 text-sm font-bold ${stateOrder === "alphabetical" ? "bg-[#151a20] text-white" : "text-black/65"}`} aria-pressed={stateOrder === "alphabetical"} onClick={() => setStateOrder("alphabetical")}>A–Z</button><button type="button" className={`rounded-full px-4 py-2 text-sm font-bold ${stateOrder === "population" ? "bg-[#151a20] text-white" : "text-black/65"}`} aria-pressed={stateOrder === "population"} onClick={() => setStateOrder("population")}>População</button></div></div>
      <ul className="mt-8 grid gap-4 md:grid-cols-2">{states.map(state => <li key={state.uf}><Link href={`/busca?ano=${coverage.data?.referenceYear ?? 2025}&uf=${state.uf}`} className="block rounded-[1.35rem] bg-white p-6 shadow-[0_8px_30px_rgba(18,25,32,.05)] transition hover:-translate-y-0.5 hover:bg-[#f9e4e8] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1e4a77]/35"><div className="flex items-start justify-between gap-4"><div><p className="text-2xl font-black tracking-[-.05em]">{state.uf}</p><p className="mt-2 text-sm leading-6 text-black/65">{number(state.municipalityCount)} municípios com população de referência em {state.populationReferenceYear ?? "ano não informado"}.</p></div><span className="rounded-full bg-[#edf4fb] px-3 py-1 text-xs font-bold text-[#1e4a77]">Consultar</span></div><p className="mt-5 text-sm font-bold tabular-nums">{number(state.population)} habitantes</p><p className="mt-1 text-xs text-black/55">Atualizada em {formatDate(state.updatedAt)} · <span className="underline">IBGE</span></p></Link></li>)}</ul>
      {!coverage.isLoading && states.length === 0 && <p className="mt-8 text-sm text-black/60">Nenhuma UF possui cobertura municipal suficiente para acesso rápido.</p>}</div></section>

    <section className="container py-16 sm:py-20"><div className="grid gap-10 lg:grid-cols-[.8fr_2fr] lg:items-start"><div><p className="eyebrow">SEM CONFUNDIR AS ETAPAS</p><h2 className="mt-3 text-3xl font-black tracking-[-0.055em] sm:text-4xl">Pagar não é, sozinho, entregar.</h2><p className="mt-4 max-w-sm leading-7 text-black/65">A execução financeira e a execução do objeto são medidas separadas. Uma obra pode receber recurso e ainda não estar pronta.</p></div><div className="grid gap-4 md:grid-cols-3">{steps.map(step => <article key={step.title} className="rounded-[1.4rem] bg-white p-6 shadow-[0_8px_30px_rgba(18,25,32,0.05)]"><step.icon size={23} className="text-[#1e4a77]" aria-hidden="true" /><h3 className="mt-8 font-bold tracking-[-0.025em]">{step.title}</h3><p className="mt-3 text-sm leading-6 text-black/65">{step.text}</p></article>)}</div></div></section>
    <section className="border-y border-black/10 bg-[#e9eff4]"><div className="container grid gap-8 py-12 md:grid-cols-[1.2fr_1fr] md:items-center"><div><p className="eyebrow">ENTENDA ANTES DE CONCLUIR</p><h2 className="mt-3 text-3xl font-black tracking-[-0.055em]">Dados ausentes aparecem como ausentes.</h2><p className="mt-4 max-w-2xl leading-7 text-black/65">Não preenchemos lacunas com estimativas e não atribuímos irregularidade. A plataforma apresenta registros, suas limitações e links para conferência.</p></div><Link className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-3 font-bold shadow-sm transition hover:bg-[#f9e4e8] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1e4a77]/35" href="/metodologia"><Search size={17} /> Ler metodologia e glossário</Link></div></section>
  </PortalLayout>;
}
