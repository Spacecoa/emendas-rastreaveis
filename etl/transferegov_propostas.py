"""Extrai objetos oficiais de propostas do Transferegov para um catálogo ainda não conciliado.

Uso: python3 etl/transferegov_propostas.py --arquivo /tmp/propostas.zip --uf RJ --ano 2025 --limite 200 --saida /tmp/objetos-rj-2025.jsonl
Os resultados não são atribuídos a uma emenda da CGU sem chave de conciliação confirmada.
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


SOURCE_URL = "https://repositorio.dados.gov.br/seges/detru/siconv_proposta.csv.zip"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--arquivo", type=Path, required=True)
    parser.add_argument("--uf", required=True)
    parser.add_argument("--ano", type=int, required=True)
    parser.add_argument("--limite", type=int, default=200)
    parser.add_argument("--saida", type=Path, required=True)
    args = parser.parse_args()
    if args.limite < 1 or args.limite > 10_000:
        raise SystemExit("O limite deve estar entre 1 e 10000.")

    extracted_at = datetime.now(timezone.utc).isoformat()
    records: list[dict] = []
    with zipfile.ZipFile(args.arquivo) as archive:
        csv_name = next(name for name in archive.namelist() if name.lower().endswith(".csv"))
        with archive.open(csv_name) as binary_file:
            reader = csv.DictReader(io.TextIOWrapper(binary_file, encoding="utf-8-sig"), delimiter=";")
            for row in reader:
                if row.get("UF_PROPONENTE", "").upper() != args.uf.upper() or row.get("ANO_PROP") != str(args.ano):
                    continue
                description = (row.get("OBJETO_PROPOSTA") or "").strip()
                if not description:
                    continue
                raw = json.dumps(row, ensure_ascii=False, sort_keys=True).encode("utf-8")
                records.append({
                    "record_kind": "objeto",
                    "external_key": row.get("ID_PROPOSTA"),
                    "cnpj": "".join(character for character in (row.get("IDENTIF_PROPONENTE") or "") if character.isdigit()) or None,
                    "label": description,
                    "uf": args.uf.upper(),
                    "reference_year": args.ano,
                    "source": "Transferegov — Propostas",
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
    print(json.dumps({"ok": True, "records": len(records), "uf": args.uf.upper(), "year": args.ano, "source": SOURCE_URL}))


if __name__ == "__main__":
    main()
