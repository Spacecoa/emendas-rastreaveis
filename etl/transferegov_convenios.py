"""Extrai convênios oficiais vinculados às propostas já carregadas no catálogo.

Uso: python3 etl/transferegov_convenios.py --arquivo /tmp/convenios.zip --objetos /tmp/objetos-rj-2025.jsonl --limite 200 --saida /tmp/instrumentos-rj-2025.jsonl
Os instrumentos são preservados como registros não conciliados e não recebem amendmentId sem chave verificável.
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


SOURCE_URL = "https://repositorio.dados.gov.br/seges/detru/siconv_convenio.csv.zip"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--arquivo", type=Path, required=True)
    parser.add_argument("--objetos", type=Path, required=True)
    parser.add_argument("--limite", type=int, default=200)
    parser.add_argument("--saida", type=Path, required=True)
    args = parser.parse_args()
    if args.limite < 1 or args.limite > 10_000:
        raise SystemExit("O limite deve estar entre 1 e 10000.")

    proposal_metadata = {
        str(record.get("external_key")): {
            "uf": record.get("uf"),
            "reference_year": record.get("reference_year"),
        }
        for line in args.objetos.read_text(encoding="utf-8").splitlines()
        if line.strip()
        for record in [json.loads(line)]
        if record.get("external_key")
    }
    proposal_ids = set(proposal_metadata)
    extracted_at = datetime.now(timezone.utc).isoformat()
    records: list[dict] = []
    with zipfile.ZipFile(args.arquivo) as archive:
        csv_name = next(name for name in archive.namelist() if name.lower().endswith(".csv"))
        with archive.open(csv_name) as binary_file:
            reader = csv.DictReader(io.TextIOWrapper(binary_file, encoding="utf-8-sig"), delimiter=";")
            for row in reader:
                proposal_id = str(row.get("ID_PROPOSTA") or "")
                if proposal_id not in proposal_ids:
                    continue
                number = (row.get("NR_CONVENIO") or "").strip()
                status = (row.get("SIT_CONVENIO") or "Situação não informada").strip()
                if not number:
                    continue
                proposal = proposal_metadata[proposal_id]
                uf = proposal.get("uf")
                reference_year = proposal.get("reference_year")
                if not uf or not reference_year:
                    raise SystemExit(f"A proposta {proposal_id} não possui UF e ano territoriais documentados.")
                raw = json.dumps(row, ensure_ascii=False, sort_keys=True).encode("utf-8")
                records.append({
                    "record_kind": "instrumento",
                    "external_key": proposal_id,
                    "cnpj": None,
                    "label": f"Convênio {number} · {status}",
                    "uf": uf,
                    "reference_year": reference_year,
                    "source": "Transferegov — Convênios",
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
    print(json.dumps({"ok": True, "records": len(records), "source": SOURCE_URL}))


if __name__ == "__main__":
    main()
