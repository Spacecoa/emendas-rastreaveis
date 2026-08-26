import { CircleAlert, CircleCheck, CircleHelp, Clock3, TriangleAlert } from "lucide-react";
import type { ComplianceStatus } from "../../../server/portalTransparency";

const config: Record<ComplianceStatus, { label: string; className: string; Icon: typeof CircleHelp; description: string }> = {
  executada_comprovada: { label: "Executada e comprovada", className: "bg-[#dbeee7] text-[#155b45]", Icon: CircleCheck, description: "Há evidência financeira e física suficiente nas fontes integradas." },
  em_execucao: { label: "Em execução dentro do prazo", className: "bg-[#e7eff9] text-[#1e4a77]", Icon: Clock3, description: "A execução financeira segue em curso; a entrega física precisa ser acompanhada." },
  pendencia: { label: "Atraso ou pendência", className: "bg-[#f8e5bf] text-[#6f4b00]", Icon: TriangleAlert, description: "Há atraso conhecido ou prestação de contas pendente." },
  nao_cumprida: { label: "Vigência vencida sem entrega", className: "bg-[#f3dfe2] text-[#822437]", Icon: CircleAlert, description: "Há sinal oficial de vigência vencida, obra paralisada ou contas rejeitadas." },
  informacao_insuficiente: { label: "Informação insuficiente", className: "bg-[#e5e8eb] text-[#374151]", Icon: CircleHelp, description: "As fontes atuais não permitem verificar a entrega do objeto. Este é o padrão para transferências especiais nesta etapa." },
};

export function StatusBadge({ status, linked = true }: { status: ComplianceStatus; linked?: boolean }) {
  const item = config[status];
  const content = <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold leading-4 ${item.className}`}><item.Icon size={14} aria-hidden="true" />{item.label}</span>;
  return linked ? <a href="/metodologia#semaforo" className="rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1e4a77]/35" aria-label={`${item.label}. Ver regra de cálculo na metodologia.`}>{content}</a> : content;
}

export function statusDescription(status: ComplianceStatus) { return config[status].description; }
