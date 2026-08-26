import React, { useMemo, useState } from "react";
import { ArrowUpRight, BookOpenCheck, Database, ExternalLink, MapPinned, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import PortalLayout from "@/components/PortalLayout";
import { formatDate } from "@/lib/format";
import { trpc } from "@/lib/trpc";

function number(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR").format(value ?? 0);
}

function sourceLabel(url: string | null | undefined) {
  if (!url) return "Fonte não informada";
  if (url.includes("ibge")) return "IBGE";
  if (url.includes("transferegov") || url.includes("dados.gov.br")) return "Transferegov";
  return "Fonte oficial";
}

function MetricCard({ icon: Icon, label, value, text, tone = "plain" }: { icon: typeof Database; label: string; value: string; text: string; tone?: "plain" | "blue" | "caution" }) {
  const toneClass = tone === "blue" ? "border border-[#b6d6f0] bg-[#edf4fb]" : tone === "caution" ? "border border-[#e9c6ce] bg-[#fff8f9]" : "bg-white shadow-[0_8px_30px_rgba(18,25,32,.05)]";
  const iconClass = tone === "caution" ? "text-[#822437]" : "text-[#1e4a77]";
  return <article className={`rounded-[1.35rem] p-6 ${toneClass}`}><Icon className={iconClass} size={22} /><p className="mt-8 text-sm font-semibold text-black/60">{label}</p><strong className="mt-1 block text-4xl font-black tracking-[-.06em]">{value}</strong><p className="mt-2 text-sm leading-6 text-black/65">{text}</p></article>;
}

export default function CoveragePage() {
  const coverage = trpc.emendas.coverage.useQuery(undefined, { retry: false });
  const [order, setOrder] = useState<"alphabetical" | "catalog">("alphabetical");
  const states = useMemo(() => {
    const values = [...(coverage.data?.availableStates ?? [])];
    return values.sort((a, b) => order === "alphabetical"
      ? a.uf.localeCompare(b.uf, "pt-BR")
      : (b.catalog.objects + b.catalog.instruments) - (a.catalog.objects + a.catalog.instruments) || a.uf.localeCompare(b.uf, "pt-BR"));
  }, [coverage.data?.availableStates, order]);
  const reconciliation = coverage.data?.reconciliation;
  const year = coverage.data?.referenceYear ?? 2025;

  return <PortalLayout><div className="container py-12 sm:py-16">
    <header className="max-w-4xl">
      <p className="eyebrow">COBERTURA E RASTREABILIDADE</p>
      <h1 className="mt-3 text-4xl font-black tracking-[-0.065em] sm:text-5xl">O que está carregado,<br className="hidden sm:block" /> e o que ainda não se pode afirmar.</h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-black/68">Esta aba mostra registros oficiais persistidos, fontes e alcance documental por UF. Não preenche lacunas, não deduz UF por texto e não trata pagamento ou conciliação como prova de entrega física.</p>
    </header>

    {coverage.isLoading ? <div className="mt-12 rounded-[1.5rem] bg-white p-8 text-sm shadow-[0_8px_30px_rgba(18,25,32,.05)]">Lendo a cobertura persistida…</div> : !coverage.data ? <div className="mt-12 rounded-[1.5rem] bg-white p-8 text-sm shadow-[0_8px_30px_rgba(18,25,32,.05)]">A síntese de cobertura não está disponível neste momento.</div> : <>
      <section className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo da cobertura">
        <MetricCard icon={MapPinned} label="UFs com população IBGE" value={number(states.length)} text={`Cadastro municipal e estimativa de ${year}.`} tone="blue" />
        <MetricCard icon={Database} label="Emendas CGU carregadas" value={number(coverage.data.totals.amendments)} text={`Amostra financeira oficial do exercício ${year}.`} />
        <MetricCard icon={BookOpenCheck} label="Catálogo territorial" value={number(coverage.data.totals.objects)} text={`Objetos e ${number(coverage.data.totals.instruments)} instrumentos com proveniência.`} />
        <MetricCard icon={ShieldCheck} label="Chaves conciliadas" value={reconciliation ? `${number(reconciliation.matched)}/${number(reconciliation.evaluated)}` : "—"} text={reconciliation?.matchRate !== null && reconciliation?.matchRate !== undefined ? `${(reconciliation.matchRate * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% por chave exata; não comprova entrega.` : "Taxa ainda não disponível."} tone="caution" />
      </section>

      <section className="mt-10 rounded-[1.5rem] border border-black/10 bg-[#171c21] p-6 text-white sm:p-8" aria-labelledby="como-ler-cobertura">
        <p className="text-xs font-bold tracking-[.12em] text-[#b6d6f0]">COMO LER ESTA PÁGINA</p>
        <h2 id="como-ler-cobertura" className="mt-3 text-2xl font-black tracking-[-.045em]">Cobertura é presença de dados, não confirmação de resultado.</h2>
        <div className="mt-6 grid gap-5 text-sm leading-6 text-white/80 md:grid-cols-3"><p><strong className="text-white">UF carregada</strong><br />Municípios e população IBGE com fonte, data e hash.</p><p><strong className="text-white">Catálogo</strong><br />Beneficiários, objetos ou instrumentos disponíveis para conferência.</p><p><strong className="text-white">Conciliado</strong><br />Chave documental exata entre bases; não demonstra execução física.</p></div>
      </section>

      <section className="mt-12 min-w-0" aria-labelledby="cobertura-uf">
        <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">POR UNIDADE FEDERATIVA</p><h2 id="cobertura-uf" className="mt-2 text-3xl font-black tracking-[-.055em]">Rastreabilidade visível por UF.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-black/65">As contagens vêm do banco persistido. Fontes abrem a origem registrada; hashes contabilizados ajudam a detectar registros sem proveniência ou duplicados.</p></div><div className="flex rounded-full border border-black/15 bg-white p-1" role="group" aria-label="Ordenar cobertura por UF"><button type="button" className={`rounded-full px-4 py-2 text-sm font-bold ${order === "alphabetical" ? "bg-[#171c21] text-white" : "text-black/65"}`} aria-pressed={order === "alphabetical"} onClick={() => setOrder("alphabetical")}>A–Z</button><button type="button" className={`rounded-full px-4 py-2 text-sm font-bold ${order === "catalog" ? "bg-[#171c21] text-white" : "text-black/65"}`} aria-pressed={order === "catalog"} onClick={() => setOrder("catalog")}>Catálogo</button></div></div>

        <div className="mt-7 hidden max-w-full overflow-x-auto rounded-[1.4rem] bg-white shadow-[0_8px_30px_rgba(18,25,32,.05)] md:block" tabIndex={0} aria-label="Tabela de cobertura por UF. Em telas estreitas, deslize horizontalmente para ler todas as colunas."><table className="min-w-[1040px] w-full text-left"><caption className="sr-only">Cobertura territorial e rastreabilidade por UF</caption><thead className="border-b border-black/10 bg-[#edf4fb] text-xs uppercase tracking-[.08em] text-black/60"><tr><th className="px-5 py-4">UF</th><th className="px-5 py-4">IBGE</th><th className="px-5 py-4">Catálogo</th><th className="px-5 py-4">Conciliação</th><th className="px-5 py-4">Atualização</th><th className="px-5 py-4">Proveniência</th><th className="px-5 py-4"><span className="sr-only">Consulta</span></th></tr></thead><tbody>{states.map(state => { const catalog = state.catalog; const links = catalog.provenance.filter(item => item.sourceUrl); return <tr key={state.uf} className="border-b border-black/5 align-top last:border-0"><th scope="row" className="px-5 py-5 text-lg font-black">{state.uf}</th><td className="px-5 py-5 text-sm leading-6"><strong>{number(state.municipalityCount)} municípios</strong><br /><span className="text-black/60">{number(state.population)} habitantes · {state.populationReferenceYear ?? "ano não informado"}</span></td><td className="px-5 py-5 text-sm leading-6"><strong>{number(catalog.beneficiaries)} beneficiários</strong><br /><span className="text-black/60">{number(catalog.objects)} objetos · {number(catalog.instruments)} instrumentos</span></td><td className="px-5 py-5 text-sm leading-6"><strong>{number(catalog.reconciledObjects + catalog.reconciledInstruments)} vínculos</strong><br /><span className="text-black/60">de {number(catalog.objects + catalog.instruments)} itens</span></td><td className="px-5 py-5 text-sm leading-6"><strong>{formatDate(catalog.catalogUpdatedAt ?? state.updatedAt)}</strong><br /><span className="text-black/60">IBGE + catálogo</span></td><td className="px-5 py-5 text-sm leading-6"><div className="flex flex-wrap gap-2">{state.populationSourceUrl && <a className="rounded-full border border-black/15 px-3 py-1 font-semibold hover:bg-[#edf4fb] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1e4a77]/35" href={state.populationSourceUrl} target="_blank" rel="noreferrer">IBGE <ExternalLink className="inline" size={12} /></a>}{links.map(item => <a key={`${state.uf}-${item.kind}`} className="rounded-full border border-black/15 px-3 py-1 font-semibold hover:bg-[#edf4fb] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1e4a77]/35" href={item.sourceUrl!} target="_blank" rel="noreferrer">{sourceLabel(item.sourceUrl)} · {number(item.hashes)} hashes <ExternalLink className="inline" size={12} /></a>)}</div></td><td className="px-5 py-5"><Link href={`/busca?ano=${year}&uf=${state.uf}`} className="inline-flex size-9 items-center justify-center rounded-full border border-black/15 hover:bg-[#edf4fb] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1e4a77]/35" aria-label={`Consultar emendas com vínculo territorial em ${state.uf}`}><ArrowUpRight size={17} /></Link></td></tr>; })}</tbody></table></div>

        <ul className="mt-7 divide-y divide-black/8 overflow-hidden rounded-[1.4rem] bg-white shadow-[0_8px_30px_rgba(18,25,32,.05)] md:hidden" aria-label="Cobertura territorial por UF">{states.map(state => { const catalog = state.catalog; const links = catalog.provenance.filter(item => item.sourceUrl); return <li key={state.uf} className="p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-2xl font-black tracking-[-.05em]">{state.uf}</p><p className="mt-1 text-sm text-black/60">{number(state.municipalityCount)} municípios · população {state.populationReferenceYear ?? "não informada"}</p></div><Link href={`/busca?ano=${year}&uf=${state.uf}`} className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-black/15 hover:bg-[#edf4fb] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1e4a77]/35" aria-label={`Consultar emendas com vínculo territorial em ${state.uf}`}><ArrowUpRight size={17} /></Link></div><dl className="mt-5 grid grid-cols-2 gap-4 text-sm"><div><dt className="text-black/55">Catálogo</dt><dd className="mt-1 font-bold">{number(catalog.objects)} objetos<br />{number(catalog.instruments)} instrumentos</dd></div><div><dt className="text-black/55">Conciliação</dt><dd className="mt-1 font-bold">{number(catalog.reconciledObjects + catalog.reconciledInstruments)} vínculos<br /><span className="font-normal text-black/60">de {number(catalog.objects + catalog.instruments)} itens</span></dd></div></dl><div className="mt-5 flex flex-wrap gap-2">{state.populationSourceUrl && <a className="rounded-full border border-black/15 px-3 py-1 text-xs font-semibold hover:bg-[#edf4fb] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1e4a77]/35" href={state.populationSourceUrl} target="_blank" rel="noreferrer">IBGE <ExternalLink className="inline" size={11} /></a>}{links.map(item => <a key={`${state.uf}-mobile-${item.kind}`} className="rounded-full border border-black/15 px-3 py-1 text-xs font-semibold hover:bg-[#edf4fb] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1e4a77]/35" href={item.sourceUrl!} target="_blank" rel="noreferrer">{sourceLabel(item.sourceUrl)} · {number(item.hashes)} hashes <ExternalLink className="inline" size={11} /></a>)}</div></li>; })}</ul>
      </section>

      <section className="mt-12 grid gap-5 lg:grid-cols-[1.1fr_.9fr]" aria-labelledby="fontes-cobertura"><article className="rounded-[1.4rem] bg-white p-7 shadow-[0_8px_30px_rgba(18,25,32,.05)]"><p className="eyebrow">FONTES INTEGRADAS</p><h2 id="fontes-cobertura" className="mt-2 text-2xl font-black tracking-[-.045em]">De onde os números vieram.</h2><ul className="mt-6 divide-y divide-black/8">{coverage.data.sources.map(source => <li key={source.name} className="flex flex-wrap items-start justify-between gap-4 py-4"><div><p className="font-bold">{source.name}</p><p className="mt-1 text-sm leading-6 text-black/60">{source.coverageNote ?? "Cobertura sem nota adicional."}</p><p className="mt-1 text-xs text-black/50">Última carga: {formatDate(source.latestSuccessfulLoadAt)}</p></div><a href={source.baseUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-black/15 px-3 py-2 text-sm font-bold hover:bg-[#edf4fb] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1e4a77]/35">Abrir fonte <ExternalLink size={14} /></a></li>)}</ul></article><aside className="rounded-[1.4rem] border border-[#e9c6ce] bg-[#fff8f9] p-7"><p className="eyebrow text-[#822437]">LIMITE DE INTERPRETAÇÃO</p><h2 className="mt-2 text-2xl font-black tracking-[-.045em]">Não confunda dados com conclusão.</h2><p className="mt-4 text-sm leading-7 text-black/68">Uma UF com catálogo não necessariamente possui emenda conciliada. Uma emenda conciliada não demonstra que o objeto foi entregue. E um valor pago não confirma, por si só, benefício ao município.</p><Link href="/metodologia" className="mt-6 inline-flex items-center gap-2 font-bold underline decoration-[#1e4a77]/35 underline-offset-4 hover:text-[#1e4a77]">Ver metodologia e limites <ArrowUpRight size={16} /></Link></aside></section>
    </>}
  </div></PortalLayout>;
}
