import { createHash } from "node:crypto";
import {
  complianceFromOfficialFields,
  parseBrazilianAmount,
  type OfficialAmendment,
} from "./portalTransparency";

export const CGU_NATIONAL_FILE_URL =
  "https://dadosabertos-download.cgu.gov.br/PortalDaTransparencia/saida/emendas-parlamentares/EmendasParlamentares.zip";

export type CguNationalAmendment = OfficialAmendment & {
  municipalityIbgeCode: string | null;
  authorCode: string | null;
};

function headerKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

export function parseSemicolonCsvLine(line: string) {
  const fields: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ";" && !quoted) {
      fields.push(value);
      value = "";
    } else {
      value += character;
    }
  }
  fields.push(value.replace(/\r$/, ""));
  return fields;
}

export function createCguHeaderIndex(headers: string[]) {
  return new Map(headers.map((header, index) => [headerKey(header), index]));
}

function field(
  index: Map<string, number>,
  values: string[],
  header: string
) {
  const position = index.get(headerKey(header));
  const value = position === undefined ? null : values[position]?.trim() || null;
  return value;
}

export function toCguNationalAmendment(
  index: Map<string, number>,
  values: string[],
  sourceUrl: string,
  extractedAt: string
): CguNationalAmendment | null {
  const code = field(index, values, "Código da Emenda");
  const yearText = field(index, values, "Ano da Emenda");
  const year = yearText === null ? null : Number(yearText);
  if (!code || !Number.isInteger(year)) return null;

  const base = {
    code,
    year,
    type: field(index, values, "Tipo de Emenda"),
    author: field(index, values, "Nome do Autor da Emenda"),
    number: field(index, values, "Número da emenda"),
    locality: field(index, values, "Localidade de aplicação do recurso"),
    budgetFunction: field(index, values, "Nome Função"),
    budgetSubfunction: field(index, values, "Nome Subfunção"),
    committed: parseBrazilianAmount(
      field(index, values, "Valor Empenhado") ?? undefined
    ),
    settled: parseBrazilianAmount(
      field(index, values, "Valor Liquidado") ?? undefined
    ),
    paid: parseBrazilianAmount(field(index, values, "Valor Pago") ?? undefined),
    remainingRegistered: parseBrazilianAmount(
      field(index, values, "Valor Restos A Pagar Inscritos") ?? undefined
    ),
    remainingCancelled: parseBrazilianAmount(
      field(index, values, "Valor Restos A Pagar Cancelados") ?? undefined
    ),
    remainingPaid: parseBrazilianAmount(
      field(index, values, "Valor Restos A Pagar Pagos") ?? undefined
    ),
  };

  return {
    ...base,
    complianceStatus: complianceFromOfficialFields(base),
    municipalityIbgeCode: field(index, values, "Código Município IBGE"),
    authorCode: field(index, values, "Código do Autor da Emenda"),
    source: "Portal da Transparência (CGU)",
    sourceUrl,
    extractedAt,
    recordHash: createHash("sha256")
      .update(JSON.stringify(values))
      .digest("hex"),
  };
}
