"""Extrai estimativas municipais oficiais do IBGE em ODS para JSONL auditável.

Uso:
  python3 etl/ibge_populacao.py --arquivo /tmp/POP2025_20260113.ods --uf RJ --ano 2025 --saida /tmp/populacao-rj-2025.jsonl
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {
    "table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
    "text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
    "office": "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
}
DEFAULT_SOURCE_URL = "https://ftp.ibge.gov.br/Estimativas_de_Populacao/Estimativas_2025/POP2025_20260113.ods"
UF_BY_IBGE_PREFIX = {
    "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO",
    "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL", "28": "SE", "29": "BA",
    "31": "MG", "32": "ES", "33": "RJ", "35": "SP", "41": "PR", "42": "SC", "43": "RS",
    "50": "MS", "51": "MT", "52": "GO", "53": "DF",
}


def normalized(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ASCII", "ignore").decode("ASCII")
    return re.sub(r"[^A-Z0-9]", "", ascii_value.upper())


def cells(row: ET.Element) -> list[str]:
    values: list[str] = []
    for cell in row:
        if cell.tag not in {f"{{{NS['table']}}}table-cell", f"{{{NS['table']}}}covered-table-cell"}:
            continue
        repeated = int(cell.get(f"{{{NS['table']}}}number-columns-repeated", "1"))
        text = " ".join(part.strip() for part in cell.itertext() if part.strip())
        value = cell.get(f"{{{NS['office']}}}value") or text
        # Planilhas ODS costumam repetir milhares de colunas vazias ao fim da linha.
        # Elas não fazem parte da tabela de dados e não devem expandir a memória do ETL.
        if not value and repeated > 32:
            continue
        values.extend([value] * min(repeated, 32))
    return values


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--arquivo", type=Path, required=True)
    parser.add_argument("--uf", required=True)
    parser.add_argument("--ano", type=int, required=True)
    parser.add_argument("--saida", type=Path, required=True)
    parser.add_argument("--source-url", default=DEFAULT_SOURCE_URL)
    args = parser.parse_args()
    uf = args.uf.upper()

    with zipfile.ZipFile(args.arquivo) as archive:
        root = ET.fromstring(archive.read("content.xml"))
    sheet = next((item for item in root.findall(".//table:table", NS) if item.get(f"{{{NS['table']}}}name") == "Municípios"), None)
    if sheet is None:
        raise ValueError("A planilha não contém a aba 'Municípios'.")

    rows = [cells(row) for row in sheet.findall("table:table-row", NS)]
    header_index = next((index for index, row in enumerate(rows) if any(normalized(cell).startswith("COD") for cell in row) and any("MUNICIP" in normalized(cell) for cell in row) and any("POPULA" in normalized(cell) for cell in row)), None)
    if header_index is None:
        raise ValueError("Não foi possível identificar o cabeçalho com código e população.")
    header = [normalized(cell) for cell in rows[header_index]]
    code_index = next(index for index, cell in enumerate(header) if "CODMUNIC" in cell)
    uf_code_index = next(index for index, cell in enumerate(header) if cell == "CODUF")
    uf_index = next(index for index, cell in enumerate(header) if cell == "UF")
    name_index = next(index for index, cell in enumerate(header) if "MUNICIP" in cell)
    population_index = next(index for index, cell in enumerate(header) if "POPULACAO" in cell)

    extracted_at = datetime.now(timezone.utc).isoformat()
    source = f"IBGE — Estimativas da População {args.ano}"
    records = []
    for row in rows[header_index + 1:]:
        if len(row) <= max(code_index, name_index, population_index):
            continue
        municipal_code = re.sub(r"\D", "", row[code_index]).zfill(5)
        uf_code = re.sub(r"\D", "", row[uf_code_index]).zfill(2)
        code = f"{uf_code}{municipal_code}"
        if row[uf_index].strip().upper() != uf or UF_BY_IBGE_PREFIX.get(code[:2]) != uf:
            continue
        population = int(float(row[population_index]))
        name = row[name_index].strip()
        raw = json.dumps({"code": code, "name": name, "population": population, "year": args.ano}, ensure_ascii=False, sort_keys=True).encode("utf-8")
        population_hash = hashlib.sha256(raw).hexdigest()
        records.append({
            "ibge_code": code,
            "name": name,
            "uf": uf,
            "population": population,
            "population_reference_year": args.ano,
            "population_source": source,
            "population_source_url": args.source_url,
            "population_extracted_at": extracted_at,
            "population_record_hash": population_hash,
            "source": source,
            "source_url": args.source_url,
            "extracted_at": extracted_at,
            "record_hash": population_hash,
        })

    if not records:
        raise ValueError(f"Nenhum município de {uf} foi encontrado na planilha. Cabeçalho identificado: {header}")
    args.saida.parent.mkdir(parents=True, exist_ok=True)
    with args.saida.open("w", encoding="utf-8") as output:
        for record in records:
            output.write(json.dumps(record, ensure_ascii=False) + "\n")
    print(json.dumps({"ok": True, "records": len(records), "uf": uf, "year": args.ano, "source": args.source_url}))


if __name__ == "__main__":
    main()
