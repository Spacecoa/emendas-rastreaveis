import { useMemo } from "react";
import React from "react";
import { Download, ExternalLink, FileJson2, FileSpreadsheet, FileText, Loader2, SearchX } from "lucide-react";
import * as XLSX from "xlsx";
import { Link, useLocation, useSearch } from "wouter";
import PortalLayout from "@/components/PortalLayout";
import SearchPanel from "@/components/SearchPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import type { OfficialAmendment } from "../../../server/portalTransparency";

export function buildExportBlob(records: OfficialAmendment[], type: "csv" | "json" | "xlsx") {
  const rows = records.map(record => ({
    codigo_emenda: record.code, ano: record.year, numero_emenda: record.number, autor: record.author, localidade: record.locality, tipo: record.type,
    funcao: record.budgetFunction, subfuncao: record.budgetSubfunction, valor_empenhado: record.committed, valor_liquidado: record.settled, valor_pago: record.paid,
    status_cumprimento: record.complianceStatus, fonte: record.source, url_origem: record.sourceUrl, data_extracao: record.extractedAt, hash_registro: record.recordHash,
  }));
  let blob: Blob;
  if (type === "json") blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
  else if (type === "csv") {
    const keys = Object.keys(rows[0] ?? {});
    const csv = [keys.join(","), ...rows.map(row => keys.map(key => JSON.stringify(row[key as keyof typeof row] ?? "")).join(","))].join("\n");
    blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  } else {
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, "Emendas");
    blob = new Blob([XLSX.write(book, { type: "array", bookType: "xlsx" })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }
  return blob;
}

function exportRecords(records: OfficialAmendment[], type: "csv" | "json" | "xlsx") {
  const name = `emendas-em-foco-${new Date().toISOString().slice(0, 10)}`;
  const blob = buildExportBlob(records, type);
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${name}.${type}`; anchor.click(); URL.revokeObjectURL(url);
}

export default function SearchPage() {
  const [location] = useLocation();
  const searchString = useSearch();
  const input = useMemo(() => {
    const params = new URLSearchParams(searchString);
    const allowedStatuses = ["executada_comprovada", "em_execucao", "pendencia", "nao_cumprida", "informacao_insuficiente"] as const;
    const statusValue = params.get("situacao");
    const status = allowedStatuses.includes(statusValue as typeof allowedStatuses[number]) ? statusValue as typeof allowedStatuses[number] : undefined;
    const minPaidValue = Number(params.get("pagoMin"));
    const minPaid = Number.isFinite(minPaidValue) && minPaidValue >= 0 && params.has("pagoMin") ? minPaidValue : undefined;
    return { query: params.get("q") ?? "", year: Number(params.get("ano") ?? 2025), uf: params.get("uf") || undefined, status, minPaid, author: params.get("autor") || undefined, budgetFunction: params.get("funcao") || undefined, page: 1 };
  }, [location, searchString]);
  const query = trpc.emendas.search.useQuery(input, { retry: false });
  const records = query.data?.records ?? [];

  return <PortalLayout><div className="container py-12 sm:py-16">
    <p className="eyebrow">CONSULTA PÚBLICA</p><h1 className="mt-3 text-4xl font-black tracking-[-0.06em] sm:text-5xl">Encontre uma emenda, um lugar ou uma autoria.</h1><p className="mt-4 max-w-3xl border-l-2 border-[#1e4a77]/35 pl-5 leading-7 text-black/65">Os filtros ficam na URL para que o mesmo recorte possa ser compartilhado. A exportação leva exatamente os registros visíveis, incluindo proveniência.</p>
    <div className="mt-8"><SearchPanel compact initialValues={input} /></div>
    <section className="mt-10" aria-live="polite">
      {query.isLoading ? <div className="flex items-center gap-3 rounded-2xl bg-white p-8"><Loader2 className="animate-spin text-[#1e4a77]" /> Consultando a fonte oficial…</div> : query.error ? <div className="rounded-2xl border border-[#b85b6f]/30 bg-[#f9e9ed] p-7"><h2 className="font-bold">Não foi possível consultar a fonte neste momento.</h2><p className="mt-2 text-sm leading-6">A chave foi validada, mas a resposta pode estar temporariamente indisponível. Tente novamente em alguns instantes.</p></div> : <>
        <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-sm font-bold text-[#1e4a77]">{records.length} registros encontrados nesta consulta</p><p className="mt-1 text-sm text-black/60">{query.data?.sourceCoverage}</p></div>{records.length > 0 && <div className="flex flex-wrap gap-2" aria-label="Exportar recorte"><button className="export-button" onClick={() => exportRecords(records, "csv")}><FileText size={16} /> CSV</button><button className="export-button" onClick={() => exportRecords(records, "json")}><FileJson2 size={16} /> JSON</button><button className="export-button" onClick={() => exportRecords(records, "xlsx")}><FileSpreadsheet size={16} /> XLSX</button></div>}</div>
        {records.length === 0 ? <div className="mt-8 rounded-2xl bg-white p-10 text-center"><SearchX className="mx-auto text-[#1e4a77]" size={32} /><h2 className="mt-4 text-xl font-bold">Nenhum registro encontrado para este recorte.</h2><p className="mt-2 text-sm text-black/65">Revise os filtros ou tente outro termo de busca. CNPJ e objeto podem aparecer como sugestões oficiais, mas só passam a integrar uma emenda após o casamento por chaves verificáveis.</p><p className="mt-2 text-sm text-black/65">A busca não preenche ausências com dados aproximados.</p></div> : <div className="mt-6 min-w-0 overflow-hidden rounded-[1.4rem] bg-white shadow-[0_8px_30px_rgba(18,25,32,.05)]"><div className="results-scroll"><table className="min-w-[860px] w-full text-left"><caption className="sr-only">Resultados de emendas parlamentares</caption><thead className="border-b border-black/10 bg-[#edf4fb] text-xs uppercase tracking-[.08em] text-black/60"><tr><th className="px-5 py-4">Emenda</th><th className="px-5 py-4">Autoria</th><th className="px-5 py-4">Destino</th><th className="px-5 py-4">Pago</th><th className="px-5 py-4">Situação</th><th className="px-5 py-4"><span className="sr-only">Ação</span></th></tr></thead><tbody>{records.map(record => <tr key={record.code} className="border-b border-black/5 align-top last:border-0"><td className="px-5 py-5"><Link href={`/emendas/${record.code}?ano=${record.year ?? input.year}`} className="font-bold underline decoration-[#1e4a77]/35 underline-offset-4 hover:text-[#1e4a77]">{record.number ? `Emenda ${record.number}` : record.code}</Link><span className="mt-1 block text-xs text-black/55">{record.type ?? "Tipo não informado"}</span></td><td className="px-5 py-5"><Link href={`/parlamentares/${encodeURIComponent(record.author ?? "sem-autoria")}?ano=${record.year ?? input.year}`} className="font-medium hover:underline">{record.author ?? "Não informado"}</Link></td><td className="px-5 py-5"><Link href={`/municipios/${encodeURIComponent(record.locality ?? "sem-localidade")}?ano=${record.year ?? input.year}`} className="hover:underline">{record.locality ?? "Não informado"}</Link></td><td className="px-5 py-5 font-bold tabular-nums">{formatCurrency(record.paid)}</td><td className="px-5 py-5"><StatusBadge status={record.complianceStatus} /></td><td className="px-5 py-5"><Link href={`/emendas/${record.code}?ano=${record.year ?? input.year}`} className="inline-flex size-9 items-center justify-center rounded-full border border-black/15 hover:bg-[#edf4fb]" aria-label={`Ver a emenda ${record.number ?? record.code}`}><ExternalLink size={16} /></Link></td></tr>)}</tbody></table></div></div>}
      </>}
    </section>
  </div></PortalLayout>;
}
