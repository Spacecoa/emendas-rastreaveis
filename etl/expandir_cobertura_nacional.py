"""Gera recortes territoriais oficiais para as UFs ainda não carregadas.

Esta é uma execução única para expansão nacional. Beneficiários, propostas e
convênios continuam como catálogo não conciliado: nenhum amendmentId é criado.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
import unicodedata
import zipfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET

import requests


DEFAULT_UFS = (
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
    "PA", "PB", "PR", "PE", "PI", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
)
PROPOSERS_URL = "https://repositorio.dados.gov.br/seges/detru/siconv_proponentes.csv.zip"
PROPOSALS_URL = "https://repositorio.dados.gov.br/seges/detru/siconv_proposta.csv.zip"
AGREEMENTS_URL = "https://repositorio.dados.gov.br/seges/detru/siconv_convenio.csv.zip"
POPULATION_URL = "https://ftp.ibge.gov.br/Estimativas_de_Populacao/Estimativas_2025/POP2025_20260113.ods"
MUNICIPALITIES_BASE_URL = "https://servicodados.ibge.gov.br/api/v1/localidades/estados"
IBGE_PREFIXES = {
    "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO",
    "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL", "28": "SE", "29": "BA",
    "31": "MG", "32": "ES", "33": "RJ", "35": "SP", "41": "PR", "42": "SC", "43": "RS",
    "50": "MS", "51": "MT", "52": "GO", "53": "DF",
}
NS = {
    "table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
    "text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
    "office": "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
}


def classify(name: str) -> str:
    normalized = name.upper()
    if "PREFEITURA" in normalized or "MUNICIP" in normalized:
        return "municipio"
    if "GOVERNO DO ESTADO" in normalized or "ESTADO DE" in normalized:
        return "estado"
    if "MINISTER" in normalized or "UNIAO" in normalized:
        return "uniao"
    return "entidade_privada"


def hash_record(value: dict) -> str:
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()


def digit_only(value: str | None) -> str | None:
    digits = "".join(character for character in (value or "") if character.isdigit())
    return digits or None


def iter_csv_rows(archive_path: Path):
    with zipfile.ZipFile(archive_path) as archive:
        csv_name = next(name for name in archive.namelist() if name.lower().endswith(".csv"))
        with archive.open(csv_name) as binary_file:
            yield from csv.DictReader(io.TextIOWrapper(binary_file, encoding="utf-8-sig"), delimiter=";")


def write_jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as output:
        for row in rows:
            output.write(json.dumps(row, ensure_ascii=False) + "\n")


def normalized(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ASCII", "ignore").decode("ASCII")
    return re.sub(r"[^A-Z0-9]", "", ascii_value.upper())


def ods_cells(row: ET.Element) -> list[str]:
    values: list[str] = []
    for cell in row:
        if cell.tag not in {f"{{{NS['table']}}}table-cell", f"{{{NS['table']}}}covered-table-cell"}:
            continue
        repeated = int(cell.get(f"{{{NS['table']}}}number-columns-repeated", "1"))
        text = " ".join(part.strip() for part in cell.itertext() if part.strip())
        value = cell.get(f"{{{NS['office']}}}value") or text
        if not value and repeated > 32:
            continue
        values.extend([value] * min(repeated, 32))
    return values


def population_records(population_file: Path, states: set[str], year: int, extracted_at: str) -> dict[str, list[dict]]:
    with zipfile.ZipFile(population_file) as archive:
        root = ET.fromstring(archive.read("content.xml"))
    sheet = next((item for item in root.findall(".//table:table", NS) if item.get(f"{{{NS['table']}}}name") == "Municípios"), None)
    if sheet is None:
        raise ValueError("A planilha não contém a aba 'Municípios'.")
    rows = [ods_cells(row) for row in sheet.findall("table:table-row", NS)]
    header_index = next(
        index for index, row in enumerate(rows)
        if any(normalized(cell).startswith("COD") for cell in row)
        and any("MUNICIP" in normalized(cell) for cell in row)
        and any("POPULA" in normalized(cell) for cell in row)
    )
    header = [normalized(cell) for cell in rows[header_index]]
    code_index = next(index for index, cell in enumerate(header) if "CODMUNIC" in cell)
    uf_code_index = next(index for index, cell in enumerate(header) if cell == "CODUF")
    uf_index = next(index for index, cell in enumerate(header) if cell == "UF")
    name_index = next(index for index, cell in enumerate(header) if "MUNICIP" in cell)
    population_index = next(index for index, cell in enumerate(header) if "POPULACAO" in cell)
    output: dict[str, list[dict]] = defaultdict(list)
    for row in rows[header_index + 1:]:
        if len(row) <= max(code_index, uf_code_index, uf_index, name_index, population_index):
            continue
        uf = row[uf_index].strip().upper()
        municipal_code = re.sub(r"\D", "", row[code_index]).zfill(5)
        uf_code = re.sub(r"\D", "", row[uf_code_index]).zfill(2)
        code = f"{uf_code}{municipal_code}"
        if uf not in states or IBGE_PREFIXES.get(code[:2]) != uf:
            continue
        population = int(float(row[population_index]))
        raw = {"code": code, "name": row[name_index].strip(), "population": population, "year": year}
        record_hash = hash_record(raw)
        output[uf].append({
            "ibge_code": code, "name": raw["name"], "uf": uf, "population": population,
            "population_reference_year": year, "population_source": f"IBGE — Estimativas da População {year}",
            "population_source_url": POPULATION_URL, "population_extracted_at": extracted_at,
            "population_record_hash": record_hash, "source": f"IBGE — Estimativas da População {year}",
            "source_url": POPULATION_URL, "extracted_at": extracted_at, "record_hash": record_hash,
        })
    return output


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--proponentes", type=Path, required=True)
    parser.add_argument("--propostas", type=Path, required=True)
    parser.add_argument("--convenios", type=Path, required=True)
    parser.add_argument("--populacao", type=Path, required=True)
    parser.add_argument("--destino", type=Path, required=True)
    parser.add_argument("--ano", type=int, default=2025)
    parser.add_argument("--limite", type=int, default=200)
    parser.add_argument("--ufs", default=",".join(DEFAULT_UFS))
    args = parser.parse_args()
    if args.limite < 1 or args.limite > 10_000:
        raise SystemExit("O limite deve estar entre 1 e 10000.")
    states = tuple(item.strip().upper() for item in args.ufs.split(",") if item.strip())
    if not states or len(states) != len(set(states)):
        raise SystemExit("Informe uma lista não vazia de UFs distintas.")
    state_set = set(states)
    for path in (args.proponentes, args.propostas, args.convenios, args.populacao):
        if not path.is_file():
            raise SystemExit(f"Arquivo oficial não encontrado: {path}")
    extracted_at = datetime.now(timezone.utc).isoformat()
    args.destino.mkdir(parents=True, exist_ok=True)

    beneficiaries: dict[str, list[dict]] = defaultdict(list)
    for row in iter_csv_rows(args.proponentes):
        uf = (row.get("UF_PROPONENTE") or "").upper()
        name = (row.get("NM_PROPONENTE") or "").strip()
        if uf not in state_set or not name or len(beneficiaries[uf]) >= args.limite:
            continue
        beneficiaries[uf].append({
            "cnpj": digit_only(row.get("IDENTIF_PROPONENTE")), "name": name, "beneficiary_type": classify(name), "uf": uf,
            "source": "Transferegov — Proponentes", "source_url": PROPOSERS_URL, "extracted_at": extracted_at,
            "record_hash": hash_record(row),
        })

    objects: dict[str, list[dict]] = defaultdict(list)
    proposal_metadata: dict[str, dict] = {}
    for row in iter_csv_rows(args.propostas):
        uf = (row.get("UF_PROPONENTE") or "").upper()
        description = (row.get("OBJETO_PROPOSTA") or "").strip()
        proposal_id = (row.get("ID_PROPOSTA") or "").strip()
        if uf not in state_set or row.get("ANO_PROP") != str(args.ano) or not description or not proposal_id or len(objects[uf]) >= args.limite:
            continue
        record = {
            "record_kind": "objeto", "external_key": proposal_id, "cnpj": digit_only(row.get("IDENTIF_PROPONENTE")),
            "label": description, "uf": uf, "reference_year": args.ano, "source": "Transferegov — Propostas",
            "source_url": PROPOSALS_URL, "extracted_at": extracted_at, "record_hash": hash_record(row),
        }
        objects[uf].append(record)
        proposal_metadata[proposal_id] = {"uf": uf, "reference_year": args.ano}

    instruments: dict[str, list[dict]] = defaultdict(list)
    for row in iter_csv_rows(args.convenios):
        proposal_id = str(row.get("ID_PROPOSTA") or "")
        proposal = proposal_metadata.get(proposal_id)
        number = (row.get("NR_CONVENIO") or "").strip()
        if not proposal or not number or len(instruments[proposal["uf"]]) >= args.limite:
            continue
        status = (row.get("SIT_CONVENIO") or "Situação não informada").strip()
        instruments[proposal["uf"]].append({
            "record_kind": "instrumento", "external_key": proposal_id, "cnpj": None,
            "label": f"Convênio {number} · {status}", "uf": proposal["uf"],
            "reference_year": proposal["reference_year"], "source": "Transferegov — Convênios",
            "source_url": AGREEMENTS_URL, "extracted_at": extracted_at, "record_hash": hash_record(row),
        })

    municipalities: dict[str, list[dict]] = {}
    for uf in states:
        source_url = f"{MUNICIPALITIES_BASE_URL}/{uf}/municipios?orderBy=nome"
        response = requests.get(source_url, timeout=60)
        response.raise_for_status()
        rows = response.json()
        records = []
        for row in rows:
            raw = {"id": row["id"], "nome": row["nome"], "uf": uf}
            records.append({
                "ibge_code": str(row["id"]), "name": row["nome"], "uf": uf, "source": "IBGE — Municípios",
                "source_url": source_url, "extracted_at": extracted_at, "record_hash": hash_record(raw),
            })
        if not records:
            raise ValueError(f"A API IBGE não retornou municípios para {uf}.")
        municipalities[uf] = records

    populations = population_records(args.populacao, state_set, args.ano, extracted_at)
    manifest = {"year": args.ano, "limit": args.limite, "extractedAt": extracted_at, "states": {}}
    for uf in states:
        if not populations.get(uf):
            raise ValueError(f"A planilha oficial não retornou população para {uf}.")
        write_jsonl(args.destino / f"beneficiarios-{uf.lower()}.jsonl", beneficiaries[uf])
        write_jsonl(args.destino / f"objetos-{uf.lower()}-{args.ano}.jsonl", objects[uf])
        write_jsonl(args.destino / f"instrumentos-{uf.lower()}-{args.ano}.jsonl", instruments[uf])
        write_jsonl(args.destino / f"municipios-{uf.lower()}.jsonl", municipalities[uf])
        write_jsonl(args.destino / f"populacao-{uf.lower()}-{args.ano}.jsonl", populations[uf])
        manifest["states"][uf] = {
            "beneficiaries": len(beneficiaries[uf]), "objects": len(objects[uf]), "instruments": len(instruments[uf]),
            "municipalities": len(municipalities[uf]), "population": len(populations[uf]),
        }
    (args.destino / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"ok": True, "states": manifest["states"], "year": args.ano}, ensure_ascii=False))


if __name__ == "__main__":
    main()
