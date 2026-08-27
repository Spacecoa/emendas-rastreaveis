import React from "react";
import {
  CircleAlert,
  CircleCheck,
  CircleHelp,
  Clock3,
  TriangleAlert,
} from "lucide-react";
import type { ComplianceStatus } from "../../../server/portalTransparency";

const config: Record<
  ComplianceStatus,
  {
    label: string;
    className: string;
    Icon: typeof CircleHelp;
    description: string;
  }
> = {
  executada_comprovada: {
    label: "Entrega comprovada",
    className: "border border-[#1d6a55] bg-[#e0f0e9] text-[#155b45]",
    Icon: CircleCheck,
    description:
      "Há documentos oficiais suficientes sobre o dinheiro e a entrega.",
  },
  em_execucao: {
    label: "Em andamento no prazo",
    className: "border border-[#075d78] bg-[#dcedf2] text-[#063c52]",
    Icon: Clock3,
    description:
      "Há movimentação do dinheiro, mas a entrega ainda precisa ser acompanhada.",
  },
  pendencia: {
    label: "Atenção: atraso ou pendência",
    className: "border border-[#9a6515] bg-[#f8e7c9] text-[#6f4b00]",
    Icon: TriangleAlert,
    description: "A fonte aponta atraso ou prestação de contas pendente.",
  },
  nao_cumprida: {
    label: "Prazo vencido sem entrega",
    className: "border border-[#8f3742] bg-[#f7e4e5] text-[#822437]",
    Icon: CircleAlert,
    description:
      "A fonte aponta prazo vencido, obra parada ou contas rejeitadas.",
  },
  informacao_insuficiente: {
    label: "Ainda não há dados suficientes",
    className: "border border-[#62727a] bg-[#edf0ef] text-[#374151]",
    Icon: CircleHelp,
    description:
      "As fontes atuais não permitem confirmar a entrega. Isso é comum em transferências especiais nesta etapa.",
  },
};

export function StatusBadge({
  status,
  linked = true,
}: {
  status: ComplianceStatus;
  linked?: boolean;
}) {
  const item = config[status];
  const content = (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold leading-4 ${item.className}`}
    >
      <item.Icon size={14} aria-hidden="true" />
      {item.label}
    </span>
  );
  return linked ? (
    <a
      href="/metodologia#semaforo"
      className="rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1e4a77]/35"
      aria-label={`${item.label}. Ver regra de cálculo na metodologia.`}
    >
      {content}
    </a>
  ) : (
    content
  );
}

export function statusDescription(status: ComplianceStatus) {
  return config[status].description;
}
