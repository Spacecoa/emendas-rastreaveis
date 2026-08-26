"""Extrai beneficiários oficiais do arquivo diário de proponentes do Transferegov.

Uso: python3 etl/transferegov_proponentes.py --uf RJ --limite 200 --saida /tmp/beneficiarios-rj.jsonl [--arquivo /tmp/proponentes.zip]
O script baixa somente uma fonte oficial pública, não registra credenciais e mantém o hash da linha de origem.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import requests

SOURCE_URL = "https://repositorio.dados.gov.br/seges/detru/siconv_proponentes.csv.zip"


def classify(name: str) -> str:
    normalized = name.upper()
    if "PREFEITURA" in normalized or "MUNICIP" in normalized:
        return "municipio"
    if "GOVERNO DO ESTADO" in normalized or "ESTADO DE" in normalized:
        return "estado"
    if "MINISTER" in normalized or "UNIAO" in normalized:
        return "uniao"
    return "entidade_privada"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--uf", required=True, help="UF do proponente, por exemplo RJ")
    parser.add_argument("--limite", type=int, default=200)
    parser.add_argument("--saida", type=Path, required=True)
    parser.add_argument("--arquivo", type=Path, help="Arquivo ZIP oficial previamente obtido; evita novo download em caso de indisponibilidade temporária.")
    args = parser.parse_args()
    if args.limite < 1 or args.limite > 10_000:
        raise SystemExit("O limite deve estar entre 1 e 10000.")

    if args.arquivo:
        if not args.arquivo.is_file():
            raise SystemExit(f"Arquivo oficial não encontrado: {args.arquivo}")
        archive_input = args.arquivo
    else:
        response = requests.get(SOURCE_URL, timeout=120)
        response.raise_for_status()
        archive_input = io.BytesIO(response.content)
    extracted_at = datetime.now(timezone.utc).isoformat()
    records: list[dict] = []
    with zipfile.ZipFile(archive_input) as archive:
        csv_name = next(name for name in archive.namelist() if name.lower().endswith(".csv"))
        with archive.open(csv_name) as binary_file:
            reader = csv.DictReader(io.TextIOWrapper(binary_file, encoding="utf-8-sig"), delimiter=";")
            for row in reader:
                if row.get("UF_PROPONENTE", "").upper() != args.uf.upper():
                    continue
                name = (row.get("NM_PROPONENTE") or "").strip()
                if not name:
                    continue
                cnpj = "".join(character for character in (row.get("IDENTIF_PROPONENTE") or "") if character.isdigit()) or None
                raw = json.dumps(row, ensure_ascii=False, sort_keys=True).encode("utf-8")
                records.append({
                    "cnpj": cnpj,
                    "name": name,
                    "beneficiary_type": classify(name),
                    "uf": args.uf.upper(),
                    "source": "Transferegov — Proponentes",
                    "source_url": SOURCE_URL,
                    "extracted_at": extracted_at,
                    "record_hash": hashlib.sha256(raw).hexdigest(),
                })
                if len(records) >= args.limite:
                    break

    args.saida.parent.mkdir(parents=True, exist_ok=True)
    with args.saida.open("w", encoding="utf-8") as output:
        for record in records:
            output.write(json.dumps(record, ensure_ascii=False) + "\n")
    print(json.dumps({"ok": True, "records": len(records), "uf": args.uf.upper(), "source": SOURCE_URL}))


if __name__ == "__main__":
    main()
