import { runInitialPortalLoad } from "../server/emendas.ts";

const year = Number(process.argv[2] ?? 2025);
const maxPages = Number(process.argv[3] ?? 5);

if (!Number.isInteger(year) || year < 2016 || year > 2100) {
  throw new Error("Informe um ano inteiro entre 2016 e 2100.");
}

if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 10) {
  throw new Error("Informe entre 1 e 10 páginas por execução.");
}

const result = await runInitialPortalLoad(year, maxPages);
console.log(JSON.stringify({ ok: true, year, maxPages, ...result }));
