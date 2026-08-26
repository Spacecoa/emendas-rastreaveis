export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "Informação não disponível";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(value);
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "Informação não disponível";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function formatPercent(value: number | null, total: number | null) {
  if (value === null || total === null || total === 0) return "Informação não disponível";
  return new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(value / total);
}
