"""Orquestador del pipeline:  python -m etl.run [--load]

Sin --load genera Parquet, reporte de calidad y JSON del front.
Con --load además carga a PostgreSQL usando DATABASE_URL.
"""
import argparse
import os
import time

from . import config
from .clean import clean
from .extract import extract
from .snapshot import snapshot
from .validate import validate


def _load_dotenv() -> None:
    env = config.ROOT / ".env"
    if env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip().strip('"'))


def main() -> None:
    parser = argparse.ArgumentParser(description="ETL del dashboard de economía de Steam")
    parser.add_argument("--load", action="store_true", help="cargar a PostgreSQL (DATABASE_URL)")
    args = parser.parse_args()
    _load_dotenv()

    t0 = time.perf_counter()
    raw = extract()
    print(f"[1/5] extract   {raw.height:,} filas · cabecera corregida")
    df, stats = clean(raw)
    print(f"[2/5] clean     universo {stats['universe_rows']:,} · exclusiones {stats['exclusions']}")
    validate(df, stats)
    print(f"[3/5] validate  OK · {config.QUALITY_REPORT.relative_to(config.ROOT)}")
    if args.load:
        from .load import load
        print(f"[4/5] load      {load(df)}")
    else:
        print("[4/5] load      omitido (usa --load con DATABASE_URL)")
    out = snapshot(df, stats)
    print(f"[5/5] snapshot  {out} → {config.WEB_DATA_DIR.relative_to(config.ROOT)}")
    print(f"Listo en {time.perf_counter() - t0:.1f} s")


if __name__ == "__main__":
    main()
