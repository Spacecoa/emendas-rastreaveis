"""Extrai linhas oficiais de emenda do Transferegov para chaves CGU conhecidas.

Uso:
  python3 etl/transferegov_emendas.py --arquivo /tmp/emendas.zip --chaves 41840004,37660015 --saida /tmp/emendas-transferegov-rj.jsonl
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


SOURCE_URL = "https://repositorio.dados.gov.br/seges/detru/siconv_emenda.csv.zip"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--arquivo", type=Path, required=True)
    parser.add_argument("--chaves", required=True, help="Números NR_EMENDA separados por vírgula.")
    parser.add_argument("--saida", type=Path, required=True)
    args = parser.parse_args()
    keys = {key.strip() for key in args.chaves.split(",") if key.strip().isdigit() and len(key.strip()) == 8}
    if not keys:
        raise ValueError("Informe ao menos uma chave NR_EMENDA com oito dígitos.")

    extracted_at = datetime.now(timezone.utc).isoformat()
    records: list[dict] = []
    with zipfile.ZipFile(args.arquivo) as archive:
        csv_name = next(name for name in archive.namelist() if name.lower().endswith(".csv"))
        with archive.open(csv_name) as binary_file:
            reader = csv.DictReader(io.TextIOWrapper(binary_file, encoding="utf-8-sig"), delimiter=";")
            for row in reader:
                amendment_number = (row.get("NR_EMENDA") or "").strip()
                if amendment_number not in keys:
                    continue
                proposal_id = (row.get("ID_PROPOSTA") or "").strip()
                if not proposal_id:
                    continue
                raw = json.dumps(row, ensure_ascii=False, sort_keys=True).encode("utf-8")
                records.append({
                    "proposal_id": proposal_id,
                    "amendment_number": amendment_number,
                    "author_name": (row.get("NOME_PARLAMENTAR") or "").strip() or None,
                    "beneficiary_cnpj": "".join(character for character in (row.get("BENEFICIARIO_EMENDA") or "") if character.isdigit()) or None,
                    "author_type": (row.get("TIPO_PARLAMENTAR") or "").strip() or None,
                    "proposal_transfer_value": (row.get("VALOR_REPASSE_PROPOSTA_EMENDA") or "").strip() or None,
                    "amendment_transfer_value": (row.get("VALOR_REPASSE_EMENDA") or "").strip() or None,
                    "source": "Transferegov — Emendas",
                    "source_url": SOURCE_URL,
                    "extracted_at": extracted_at,
                    "record_hash": hashlib.sha256(raw).hexdigest(),
                })

    args.saida.parent.mkdir(parents=True, exist_ok=True)
    with args.saida.open("w", encoding="utf-8") as output:
        for record in records:
            output.write(json.dumps(record, ensure_ascii=False) + "\n")
    print(json.dumps({"ok": True, "records": len(records), "requested_keys": len(keys), "source": SOURCE_URL}))


if __name__ == "__main__":
    main()
