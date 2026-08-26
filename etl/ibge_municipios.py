"""Extrai municípios oficiais do IBGE para uma UF.

Uso: python3 etl/ibge_municipios.py --uf RJ --saida /tmp/municipios-rj.jsonl
"""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import requests


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--uf", required=True)
    parser.add_argument("--saida", type=Path, required=True)
    args = parser.parse_args()
    uf = args.uf.upper()
    source_url = f"https://servicodados.ibge.gov.br/api/v1/localidades/estados/{uf}/municipios?orderBy=nome"
    response = requests.get(source_url, timeout=30)
    response.raise_for_status()
    extracted_at = datetime.now(timezone.utc).isoformat()
    records = []
    for item in response.json():
        raw = json.dumps(item, ensure_ascii=False, sort_keys=True).encode("utf-8")
        records.append({
            "ibge_code": str(item["id"]),
            "name": item["nome"],
            "uf": uf,
            "source": "IBGE — Localidades",
            "source_url": source_url,
            "extracted_at": extracted_at,
            "record_hash": hashlib.sha256(raw).hexdigest(),
        })
    args.saida.parent.mkdir(parents=True, exist_ok=True)
    with args.saida.open("w", encoding="utf-8") as output:
        for record in records:
            output.write(json.dumps(record, ensure_ascii=False) + "\n")
    print(json.dumps({"ok": True, "records": len(records), "uf": uf, "source": source_url}))


if __name__ == "__main__":
    main()
