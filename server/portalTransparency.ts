import { createHash } from "node:crypto";

const PORTAL_BASE_URL = "https://api.portaldatransparencia.gov.br/api-de-dados/emendas";

type PortalRawAmendment = {
  codigoEmenda?: string;
  ano?: number;
  tipoEmenda?: string;
  autor?: string;
  nomeAutor?: string;
  numeroEmenda?: string;
  localidadeDoGasto?: string;
  funcao?: string;
  subfuncao?: string;
  valorEmpenhado?: string;
  valorLiquidado?: string;
  valorPago?: string;
  valorRestoInscrito?: string;
  valorRestoCancelado?: string;
  valorRestoPago?: string;
};

export type ComplianceStatus = "executada_comprovada" | "em_execucao" | "pendencia" | "nao_cumprida" | "informacao_insuficiente";

export type ComplianceEvidence = {
  hasPhysicalEvidence?: boolean;
  hasPendingAccountability?: boolean;
  hasRejectedAccountability?: boolean;
  hasExpiredWithoutDelivery?: boolean;
  hasDelayedVigency?: boolean;
};

export type OfficialAmendment = {
  code: string;
  year: number | null;
  type: string | null;
  author: string | null;
  number: string | null;
  locality: string | null;
  budgetFunction: string | null;
  budgetSubfunction: string | null;
  committed: number | null;
  settled: number | null;
  paid: number | null;
  remainingRegistered: number | null;
  remainingCancelled: number | null;
  remainingPaid: number | null;
  complianceStatus: ComplianceStatus;
  source: "Portal da Transparência (CGU)";
  sourceUrl: string;
  extractedAt: string;
  recordHash: string;
};

export function parseBrazilianAmount(value: string | undefined): number | null {
  if (value === undefined || value === null || value.trim() === "") return null;
  const compact = value.replace(/\s/g, "");
  const normalized = compact.includes(",") ? compact.replace(/\./g, "").replace(",", ".") : compact;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function complianceFromOfficialFields(record: Pick<OfficialAmendment, "type" | "committed" | "paid">, evidence: ComplianceEvidence = {}): ComplianceStatus {
  if (evidence.hasRejectedAccountability || evidence.hasExpiredWithoutDelivery) return "nao_cumprida";
  if (evidence.hasPendingAccountability || evidence.hasDelayedVigency) return "pendencia";
  if (evidence.hasPhysicalEvidence && record.paid !== null) return "executada_comprovada";
  if (record.type?.toLowerCase().includes("transferências especiais")) return "informacao_insuficiente";
  if (record.committed === null || record.paid === null) return "informacao_insuficiente";
  if (record.committed === 0) return "em_execucao";
  if (record.paid < record.committed) return "em_execucao";
  return "informacao_insuficiente";
}

export function toOfficialAmendment(raw: PortalRawAmendment, sourceUrl: string, extractedAt: string): OfficialAmendment {
  const base = {
    code: raw.codigoEmenda ?? "",
    year: raw.ano ?? null,
    type: raw.tipoEmenda ?? null,
    author: raw.nomeAutor ?? raw.autor ?? null,
    number: raw.numeroEmenda ?? null,
    locality: raw.localidadeDoGasto ?? null,
    budgetFunction: raw.funcao ?? null,
    budgetSubfunction: raw.subfuncao ?? null,
    committed: parseBrazilianAmount(raw.valorEmpenhado),
    settled: parseBrazilianAmount(raw.valorLiquidado),
    paid: parseBrazilianAmount(raw.valorPago),
    remainingRegistered: parseBrazilianAmount(raw.valorRestoInscrito),
    remainingCancelled: parseBrazilianAmount(raw.valorRestoCancelado),
    remainingPaid: parseBrazilianAmount(raw.valorRestoPago),
  };
  return {
    ...base,
    complianceStatus: complianceFromOfficialFields(base),
    source: "Portal da Transparência (CGU)",
    sourceUrl,
    extractedAt,
    recordHash: createHash("sha256").update(JSON.stringify(raw)).digest("hex"),
  };
}

export async function fetchPortalAmendments(input: { year: number; page?: number; uf?: string }): Promise<OfficialAmendment[]> {
  const apiKey = process.env.PORTAL_TRANSPARENCIA_API_KEY;
  if (!apiKey) throw new Error("A fonte Portal da Transparência ainda não foi configurada.");

  const url = new URL(PORTAL_BASE_URL);
  url.searchParams.set("ano", String(input.year));
  url.searchParams.set("pagina", String(input.page ?? 1));
  if (input.uf) url.searchParams.set("uf", input.uf.toUpperCase());

  const response = await fetch(url, {
    headers: {
      "chave-api-dados": apiKey,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) throw new Error(`A fonte oficial respondeu com status ${response.status}.`);
  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) throw new Error("A fonte oficial respondeu em um formato inesperado.");

  const extractedAt = new Date().toISOString();
  return payload.map(item => toOfficialAmendment(item as PortalRawAmendment, url.toString(), extractedAt));
}

export async function fetchPortalDocuments(code: string) {
  const apiKey = process.env.PORTAL_TRANSPARENCIA_API_KEY;
  if (!apiKey) throw new Error("A fonte Portal da Transparência ainda não foi configurada.");
  const url = `https://api.portaldatransparencia.gov.br/api-de-dados/emendas/documentos/${encodeURIComponent(code)}`;
  const response = await fetch(url, {
    headers: { "chave-api-dados": apiKey, Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) return null;
  return { items: (await response.json()) as unknown, sourceUrl: url, extractedAt: new Date().toISOString() };
}
