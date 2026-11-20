"""Paso 1 — Extracción: lee el CSV crudo corrigiendo la cabecera y lo guarda como Parquet."""
import csv

import polars as pl

from . import config


def check_header(path=config.RAW_CSV) -> list[str]:
    """Verifica que la cabecera tenga el defecto conocido; si cambia, el pipeline debe revisarse."""
    with open(path, encoding="utf-8", newline="") as fh:
        header = next(csv.reader(fh))
    if len(header) != config.EXPECTED_HEADER_FIELDS or "DiscountDLC count" not in header:
        raise ValueError(
            f"Cabecera inesperada ({len(header)} campos). El dataset cambió: "
            "revisa config.RAW_COLUMNS antes de continuar."
        )
    return header


def extract(path=config.RAW_CSV) -> pl.DataFrame:
    check_header(path)
    df = pl.read_csv(
        path,
        has_header=False,
        skip_rows=1,
        new_columns=config.RAW_COLUMNS,
        infer_schema=False,          # todo como texto; los tipos se asignan en clean.py
        quote_char='"',
        encoding="utf8",
    )
    if df.width != len(config.RAW_COLUMNS):
        raise ValueError(f"Se esperaban {len(config.RAW_COLUMNS)} columnas y llegaron {df.width}")
    config.INTERIM_DIR.mkdir(parents=True, exist_ok=True)
    df.write_parquet(config.RAW_PARQUET)
    return df
