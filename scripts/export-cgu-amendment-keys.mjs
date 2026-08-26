import { writeFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const outputPath = process.argv[2];
const year = Number(process.argv[3] ?? 2025);
if (!outputPath) throw new Error("Informe o arquivo de saída das chaves CGU.");
if (!Number.isInteger(year)) throw new Error("Informe um ano inteiro.");
if (!process.env.DATABASE_URL)
  throw new Error("DATABASE_URL não está configurada.");

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  const [rows] = await connection.execute(
    "SELECT DISTINCT RIGHT(code, 8) AS amendmentKey FROM amendments WHERE year = ? AND RIGHT(code, 8) REGEXP '^[0-9]{8}$' ORDER BY amendmentKey",
    [year]
  );
  if (!rows.length) throw new Error(`Não há chaves CGU válidas para ${year}.`);
  const keys = rows.map(row => row.amendmentKey);
  await writeFile(outputPath, `${keys.join("\n")}\n`, "utf8");
  console.log(
    JSON.stringify({ ok: true, year, keys: keys.length, outputPath })
  );
} finally {
  connection.destroy();
}
