import React from "react";
import { formatCurrency } from "@/lib/format";

type Values = { committed: number | null; settled: number | null; paid: number | null };

export default function ExecutionBars({ values, title = "Do empenho ao pagamento" }: { values: Values; title?: string }) {
  const entries = [
    { label: "Empenhado", value: values.committed, tone: "bg-[#1e4a77]" },
    { label: "Liquidado", value: values.settled, tone: "bg-[#76a9d1]" },
    { label: "Pago", value: values.paid, tone: "bg-[#d58e9d]" },
  ];
  const maximum = Math.max(...entries.map(entry => entry.value ?? 0), 1);
  return <section aria-labelledby="escada-title" className="rounded-[1.4rem] bg-white p-5 shadow-[0_8px_30px_rgba(18,25,32,0.05)]">
    <div className="flex items-start justify-between gap-4"><div><h2 id="escada-title" className="font-bold tracking-[-0.03em]">{title}</h2><p className="mt-1 text-sm text-black/60">Cada barra mostra uma etapa financeira distinta.</p></div><span className="rounded-full bg-[#edf4fb] px-2.5 py-1 text-xs font-semibold text-[#1e4a77]">Tabela equivalente abaixo</span></div>
    <div className="mt-6 space-y-4" role="img" aria-label={entries.map(entry => `${entry.label}: ${formatCurrency(entry.value)}`).join(". ")}>
      {entries.map(entry => <div key={entry.label} className="grid grid-cols-[6.25rem_1fr_auto] items-center gap-3"><span className="text-sm font-medium">{entry.label}</span><div className="h-3 overflow-hidden rounded-full bg-[#e7eaed]"><div className={`h-full rounded-full ${entry.tone}`} style={{ width: `${Math.max(0, ((entry.value ?? 0) / maximum) * 100)}%` }} /></div><span className="text-right text-sm font-bold tabular-nums">{formatCurrency(entry.value)}</span></div>)}
    </div>
    <table className="sr-only"><caption>Valores da escada de execução financeira</caption><tbody>{entries.map(entry => <tr key={entry.label}><th>{entry.label}</th><td>{formatCurrency(entry.value)}</td></tr>)}</tbody></table>
  </section>;
}
