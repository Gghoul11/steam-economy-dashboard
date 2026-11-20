"""Paso 4 — Carga a PostgreSQL (Supabase): migraciones → staging con COPY → upsert → refresco de vistas.

Requiere DATABASE_URL (cadena de conexión de Supabase, puerto 5432 o pooler de sesión).
"""
import os
from pathlib import Path

import polars as pl
import psycopg

from . import config

MIGRATIONS = config.ROOT / "database" / "migrations"

LOAD_COLUMNS = [
    "app_id", "name", "release_date", "release_year", "release_month", "is_mature",
    "pre_steam_release", "price", "discount", "list_price", "price_band", "business_model",
    "is_price_outlier", "dlc_count", "has_dlc", "positive", "negative", "total_reviews",
    "positive_ratio", "wilson_score", "metacritic_score", "recommendations",
    "median_playtime_h", "average_playtime_h", "is_playtime_outlier", "peak_ccu",
    "owners_min", "owners_max", "owners_mid", "required_age", "achievements", "windows",
    "mac", "linux", "header_image", "developers", "publishers", "is_self_published",
    "is_indie", "primary_genre", "genres", "categories", "tags", "languages", "n_languages",
    "in_universe", "exclusion_reason",
]


def apply_migrations(conn: psycopg.Connection) -> list[str]:
    applied = []
    for sql_file in sorted(Path(MIGRATIONS).glob("*.sql")):
        conn.execute(sql_file.read_text(encoding="utf-8"))
        applied.append(sql_file.name)
    return applied


def load(df: pl.DataFrame, database_url: str | None = None) -> dict:
    url = database_url or os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("Define DATABASE_URL (ver .env.example) para cargar a PostgreSQL.")

    cols = ", ".join(LOAD_COLUMNS)
    updates = ", ".join(f"{c} = excluded.{c}" for c in LOAD_COLUMNS if c != "app_id")
    data = df.select(LOAD_COLUMNS)

    with psycopg.connect(url, autocommit=False) as conn:
        # Supabase limita la duración de cada sentencia; la carga masiva la necesita sin límite
        conn.execute("set statement_timeout = 0")
        applied = apply_migrations(conn)
        conn.execute("create temp table games_staging (like public.games including defaults) on commit drop")
        with conn.cursor().copy(f"copy games_staging ({cols}) from stdin") as copy:
            for row in data.iter_rows():
                copy.write_row(row)
        conn.execute("alter table games_staging add primary key (app_id)")
        conn.execute("analyze games_staging")
        conn.execute(
            f"insert into public.games ({cols}) select {cols} from games_staging "
            f"on conflict (app_id) do update set {updates}"
        )
        # NOT EXISTS → anti-join por índice (NOT IN sobre 125 k filas degenera en comparación cuadrática)
        conn.execute(
            "delete from public.games g where not exists "
            "(select 1 from games_staging s where s.app_id = g.app_id)"
        )
        conn.execute("select public.refresh_kpi_views()")
        n = conn.execute("select count(*), count(*) filter (where in_universe) from public.games").fetchone()
        size = conn.execute("select pg_size_pretty(pg_total_relation_size('public.games'))").fetchone()[0]
        conn.commit()
    return {"migrations": applied, "rows": n[0], "universe": n[1], "table_size": size}
