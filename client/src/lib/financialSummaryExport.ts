export type FinancialSummaryExportRow = {
  year: number;
  amendments: number;
  financialStages: number;
  committedAmount: number | null;
  settledAmount: number | null;
  paidAmount: number | null;
};

export type FinancialSummaryExportInput = {
  rows: FinancialSummaryExportRow[];
  author: { id: number; name: string } | null;
  party: string | null;
  partyAvailable: boolean;
  sourceName: string;
  sourceUrl: string | null;
  generatedAt?: Date;
};

const unavailable = "informacao_indisponivel";
const interpretationLimit =
  "Valores representam etapas financeiras distintas e não devem ser somados entre si. Pagamento não comprova entrega física.";

function csvCell(value: string | number | null | undefined) {
  return JSON.stringify(value ?? "");
}

function labelFor(input: FinancialSummaryExportInput) {
  if (input.author)
    return `Autoria: ${input.author.name} (ID ${input.author.id})`;
  if (input.party) return `Partido: ${input.party}`;
  return "Todas as autorias carregadas";
}

export function buildFinancialSummaryCsv(input: FinancialSummaryExportInput) {
  const generatedAt = input.generatedAt ?? new Date();
  const headers = [
    "exercicio",
    "recorte_autoria_id",
    "recorte_autoria",
    "recorte_partido",
    "partido_disponivel_na_carga",
    "emendas",
    "estagios_financeiros",
    "valor_empenhado_brl",
    "valor_liquidado_brl",
    "valor_pago_brl",
    "fonte",
    "url_fonte",
    "gerado_em_utc",
    "limite_de_interpretacao",
  ];
  const lines = input.rows.map(row =>
    [
      row.year,
      input.author?.id ?? "",
      input.author?.name ?? "",
      input.party ?? (input.partyAvailable ? "" : unavailable),
      input.partyAvailable ? "sim" : "nao",
      row.amendments,
      row.financialStages,
      row.committedAmount ?? unavailable,
      row.settledAmount ?? unavailable,
      row.paidAmount ?? unavailable,
      input.sourceName,
      input.sourceUrl ?? unavailable,
      generatedAt.toISOString(),
      interpretationLimit,
    ]
      .map(csvCell)
      .join(",")
  );
  return `\uFEFF${[headers.join(","), ...lines].join("\n")}`;
}

function formatCurrency(value: number | null) {
  if (value === null) return "Informação não disponível";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);
}

export async function buildFinancialSummaryPdf(
  input: FinancialSummaryExportInput
) {
  const { jsPDF } = await import("jspdf");
  const generatedAt = input.generatedAt ?? new Date();
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const left = 48;
  const pageWidth = 595.28;
  const right = pageWidth - left;
  let cursor = 48;

  const writeParagraph = (text: string, size = 10, bold = false) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, right - left);
    pdf.text(lines, left, cursor);
    cursor += lines.length * (size + 4) + 8;
  };

  pdf.setFillColor(23, 61, 99);
  pdf.rect(0, 0, pageWidth, 22, "F");
  pdf.setTextColor(23, 61, 99);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text("Emendas em Foco", left, cursor);
  cursor += 24;
  pdf.setFontSize(13);
  pdf.text("Resumo financeiro anual", left, cursor);
  cursor += 24;
  pdf.setTextColor(30, 30, 30);

  writeParagraph(`Recorte: ${labelFor(input)}`, 10, true);
  writeParagraph(
    `Gerado em UTC: ${generatedAt.toISOString()} · Fonte: ${input.sourceName}${input.sourceUrl ? ` · ${input.sourceUrl}` : ""}`,
    9
  );
  writeParagraph(
    input.partyAvailable
      ? "A filiação partidária, quando exibida, corresponde apenas ao valor registrado na fonte persistida."
      : "A carga financeira de 2022–2025 não possui partido preenchido para as autorias; nenhuma filiação foi inferida.",
    9
  );

  pdf.setFillColor(237, 244, 251);
  pdf.rect(left, cursor, right - left, 22, "F");
  pdf.setTextColor(23, 61, 99);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("ANO", left + 8, cursor + 14);
  pdf.text("EMENDAS", left + 58, cursor + 14);
  pdf.text("EMPENHADO", left + 130, cursor + 14);
  pdf.text("LIQUIDADO", left + 275, cursor + 14);
  pdf.text("PAGO", left + 410, cursor + 14);
  cursor += 34;

  pdf.setTextColor(25, 25, 25);
  for (const row of input.rows) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(String(row.year), left + 8, cursor);
    pdf.text(String(row.amendments), left + 70, cursor);
    pdf.text(formatCurrency(row.committedAmount), left + 130, cursor);
    pdf.text(formatCurrency(row.settledAmount), left + 275, cursor);
    pdf.text(formatCurrency(row.paidAmount), left + 410, cursor);
    cursor += 22;
    pdf.setDrawColor(220, 225, 230);
    pdf.line(left, cursor - 8, right, cursor - 8);
  }

  cursor += 12;
  writeParagraph(`Limite de interpretação: ${interpretationLimit}`, 9, true);
  pdf.setTextColor(90, 90, 90);
  writeParagraph(
    "Este documento é uma exportação do recorte visível no painel público. A conciliação documental disponível no projeto permanece restrita ao exercício de 2025.",
    8
  );

  return pdf.output("blob");
}

export function downloadFinancialSummary(
  blob: Blob,
  extension: "csv" | "pdf",
  authorId?: number
) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const suffix = authorId ? `-autor-${authorId}` : "-todas-autorias";
  anchor.href = url;
  anchor.download = `emendas-em-foco-resumo-financeiro${suffix}-${new Date().toISOString().slice(0, 10)}.${extension}`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
