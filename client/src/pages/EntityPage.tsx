import { Loader2, MapPinned } from "lucide-react";
import { useLocation } from "wouter";
import PortalLayout, { CompactSearchLink } from "@/components/PortalLayout";
import ExecutionBars from "@/components/ExecutionBars";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { trpc } from "@/lib/trpc";

function entityFromPath(path: string) { return decodeURIComponent(path.split("?")[0].split("/").at(-1) ?? ""); }

export default function EntityPage({ type }: { type: "municipio" | "parlamentar" }) {
  const [location] = useLocation();
  const term = entityFromPath(location);
  const params = new URLSearchParams(location.split("?")[1] ?? "");
  const year = Number(params.get("ano") ?? 2025);
  const search = trpc.emendas.search.useQuery({ query: term, year, page: 1 }, { retry: false });
  const records = search.data?.records ?? [];
  const filtered = records.filter(record => (type === "municipio" ? record.locality : record.author)?.toLocaleLowerCase("pt-BR").includes(term.toLocaleLowerCase("pt-BR")));
  const shown = filtered.length ? filtered : records;
  const committed = shown.reduce((sum, record) => sum + (record.committed ?? 0), 0);
  const paid = shown.reduce((sum, record) => sum + (record.paid ?? 0), 0);
  const title = type === "municipio" ? "Município" : "Parlamentar";

  return <PortalLayout><div className="container py-12 sm:py-16">
    <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="eyebrow">{title.toUpperCase()} · {year}</p><h1 className="mt-3 text-4xl font-black tracking-[-0.06em] sm:text-5xl">{term}</h1><p className="mt-4 max-w-3xl leading-7 text-black/65">Esta página reúne os registros retornados pela consulta oficial atual. O recorte nacional conciliado e o cálculo per capita serão adicionados depois da integração com a base municipal do IBGE.</p></div><CompactSearchLink /></div>
    {search.isLoading ? <div className="mt-10 flex items-center gap-3 rounded-2xl bg-white p-8"><Loader2 className="animate-spin text-[#1e4a77]" /> Consultando registros oficiais…</div> : <>
      {shown[0] && <aside className="mt-7 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#b6d6f0] bg-[#edf4fb] px-5 py-4 text-sm"><span><strong>Fonte do recorte:</strong> {shown[0].source} · extraído em {formatDate(shown[0].extractedAt)}</span><a className="font-bold underline underline-offset-4" href={shown[0].sourceUrl} target="_blank" rel="noreferrer">Abrir consulta oficial</a></aside>}
      <section className="mt-10 grid gap-4 md:grid-cols-3"><article className="metric-card"><p>Registros no recorte</p><strong>{shown.length}</strong><span>na página consultada</span></article><article className="metric-card"><p>Empenhado</p><strong>{formatCurrency(committed)}</strong><span>execução financeira</span></article><article className="metric-card"><p>Pago</p><strong>{formatCurrency(paid)}</strong><span>{formatPercent(paid, committed)} do empenhado conhecido</span></article></section>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]"><ExecutionBars values={{ committed, settled: shown.reduce((sum, record) => sum + (record.settled ?? 0), 0), paid }} /><aside className="rounded-[1.4rem] border border-dashed border-black/20 bg-[#f8f9fa] p-6"><MapPinned className="text-[#1e4a77]" /><h2 className="mt-5 font-bold tracking-[-.03em]">Mapa ainda não publicado</h2><p className="mt-2 text-sm leading-6 text-black/65">Não exibimos um mapa aproximado. Ele será incluído quando a conciliação com os códigos municipais do IBGE tiver cobertura e taxa de casamento publicadas.</p></aside></div>
      <section className="mt-8 overflow-hidden rounded-[1.4rem] bg-white shadow-[0_8px_30px_rgba(18,25,32,.05)]"><div className="border-b border-black/10 px-6 py-5"><h2 className="font-bold tracking-[-.03em]">Emendas no recorte</h2><p className="mt-1 text-sm text-black/60">Selecione uma emenda para ver etapas, documentos e limites de avaliação.</p></div><div className="divide-y divide-black/5">{shown.map(record => <a href={`/emendas/${record.code}?ano=${record.year ?? year}`} key={record.code} className="block px-6 py-5 transition hover:bg-[#f6f9fb] focus:bg-[#f6f9fb] focus:outline-none"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-bold">Emenda {record.number ?? record.code}</p><p className="mt-1 text-sm text-black/60">{record.budgetFunction ?? "Função não informada"} · {record.locality ?? "Localidade não informada"}</p></div><div className="flex flex-wrap items-center gap-4"><strong className="text-sm tabular-nums">{formatCurrency(record.paid)}</strong><StatusBadge status={record.complianceStatus} /></div></div></a>)}</div></section>
    </>}
  </div></PortalLayout>;
}
