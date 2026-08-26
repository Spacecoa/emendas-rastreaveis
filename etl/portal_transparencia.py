"""Extrai e normaliza emendas da API do Portal da Transparência.

Uso: PORTAL_TRANSPARENCIA_API_KEY=... python3 etl/portal_transparencia.py --ano 2025 --uf RJ --saida /tmp/emendas.jsonl
O script não preenche ausências e não grava credenciais ou dados em logs.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import requests

BASE_URL = "https://api.portaldatransparencia.gov.br/api-de-dados/emendas"


def amount(value: str | None) -> float | None:
    if value is None or not value.strip():
        return None
    compact = value.replace(" ", "")
    return float(compact.replace(".", "").replace(",", ".") if "," in compact else compact)


def normalize(record: dict, source_url: str, extracted_at: str) -> dict:
    raw = json.dumps(record, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return {
        "code": record.get("codigoEmenda"),
        "year": record.get("ano"),
        "number": record.get("numeroEmenda"),
        "type": record.get("tipoEmenda"),
        "author": record.get("nomeAutor") or record.get("autor"),
        "locality": record.get("localidadeDoGasto"),
        "budget_function": record.get("funcao"),
        "budget_subfunction": record.get("subfuncao"),
        "committed": amount(record.get("valorEmpenhado")),
        "settled": amount(record.get("valorLiquidado")),
        "paid": amount(record.get("valorPago")),
        "remaining_registered": amount(record.get("valorRestoInscrito")),
        "remaining_cancelled": amount(record.get("valorRestoCancelado")),
        "remaining_paid": amount(record.get("valorRestoPago")),
        "source": "Portal da Transparência (CGU)",
        "source_url": source_url,
        "extracted_at": extracted_at,
        "record_hash": hashlib.sha256(raw).hexdigest(),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ano", type=int, required=True)
    parser.add_argument("--uf")
    parser.add_argument("--pagina", type=int, default=1)
    parser.add_argument("--saida", type=Path, required=True)
    args = parser.parse_args()
    key = os.environ.get("PORTAL_TRANSPARENCIA_API_KEY")
    if not key:
        raise SystemExit("PORTAL_TRANSPARENCIA_API_KEY não configurada.")

    params = {"ano": args.ano, "pagina": args.pagina}
    if args.uf:
        params["uf"] = args.uf.upper()
    response = requests.get(BASE_URL, params=params, headers={"chave-api-dados": key, "Accept": "application/json"}, timeout=30)
    response.raise_for_status()
    extracted_at = datetime.now(timezone.utc).isoformat()
    args.saida.parent.mkdir(parents=True, exist_ok=True)
    with args.saida.open("w", encoding="utf-8") as output:
        for item in response.json():
            output.write(json.dumps(normalize(item, response.url, extracted_at), ensure_ascii=False) + "\n")
    print(json.dumps({"ok": True, "records": len(response.json()), "output": str(args.saida)}))


if __name__ == "__main__":
    main()
