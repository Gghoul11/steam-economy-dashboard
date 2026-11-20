"""Paso 5 — Exporta el universo analítico y agregados ligeros para el front (JSON estático).

`games.json` va en formato columnar con diccionarios de géneros y tags (índices enteros),
para que el navegador calcule los KPIs con cualquier combinación de filtros.
"""
import json

import polars as pl

from . import config

MODELS = ["Pago", "F2P", "Gratis"]
BANDS = [b for _, _, b in config.PRICE_BANDS]
TREND_YEARS = range(2006, 2026)


def _dump(obj, path):
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def snapshot(df: pl.DataFrame, stats: dict) -> dict:
    config.WEB_DATA_DIR.mkdir(parents=True, exist_ok=True)
    u = df.filter(pl.col("in_universe")).sort("total_reviews", descending=True)

    genre_counts = u.select(pl.col("genres").explode()).group_by("genres").len().sort("len", descending=True)
    genres = [g for g, n in genre_counts.iter_rows() if g and n >= config.MIN_TITLES_PER_TAG]
    tag_counts = u.select(pl.col("tags").explode()).group_by("tags").len().sort("len", descending=True)
    tags = [t for t, n in tag_counts.iter_rows() if t and n >= config.MIN_TITLES_PER_TAG]
    gi = {g: i for i, g in enumerate(genres)}
    ti = {t: i for i, t in enumerate(tags)}

    def idx(values, index):
        return [index[v] for v in values if v in index]

    def r(x, d):
        return None if x is None else round(x, d)

    rows = u.select(
        "app_id", "name", "release_year", "release_month", "list_price", "business_model",
        "price_band", "wilson_score", "total_reviews", "median_playtime_h", "peak_ccu",
        "is_indie", "has_dlc", "is_mature", "is_price_outlier", "is_playtime_outlier",
        "genres", "tags", "primary_genre",
    ).to_dicts()
    games = {
        "snapshotDate": stats["snapshot_date"],
        "genres": genres,
        "tags": tags,
        "models": MODELS,
        "bands": BANDS,
        "columns": {
            "id": [x["app_id"] for x in rows],
            "name": [x["name"] for x in rows],
            "year": [x["release_year"] for x in rows],
            "month": [x["release_month"] for x in rows],
            "price": [r(x["list_price"], 2) for x in rows],
            "model": [MODELS.index(x["business_model"]) for x in rows],
            "band": [BANDS.index(x["price_band"]) if x["price_band"] else -1 for x in rows],
            "wilson": [r(x["wilson_score"], 1) for x in rows],
            "reviews": [x["total_reviews"] for x in rows],
            "playtime": [r(x["median_playtime_h"], 1) for x in rows],
            "ccu": [x["peak_ccu"] for x in rows],
            "indie": [int(x["is_indie"]) for x in rows],
            "dlc": [int(x["has_dlc"]) for x in rows],
            "mature": [int(x["is_mature"]) for x in rows],
            "priceOutlier": [int(x["is_price_outlier"]) for x in rows],
            "playtimeOutlier": [int(x["is_playtime_outlier"]) for x in rows],
            "genres": [idx(x["genres"], gi) for x in rows],
            "tags": [idx(x["tags"], ti) for x in rows],
            "primaryGenre": [gi.get(x["primary_genre"], -1) for x in rows],
        },
    }
    _dump(games, config.WEB_DATA_DIR / "games.json")

    # Agregados sobre TODOS los juegos (no solo el universo): oferta y saturación reales
    games_all = df.filter(pl.col("exclusion_reason").is_null() | (pl.col("exclusion_reason") == "pocas_resenas"))
    year_totals = dict(
        games_all.filter(pl.col("release_year").is_in(list(TREND_YEARS)))
        .group_by("release_year").len().iter_rows()
    )
    tag_year = (
        games_all.filter(pl.col("release_year").is_in(list(TREND_YEARS)))
        .select("release_year", pl.col("tags").alias("tag"))
        .explode("tag")
        .filter(pl.col("tag").is_in(tags))
        .group_by("tag", "release_year").len()
    )
    ty = {t: [0] * len(TREND_YEARS) for t in tags}
    for tag, year, n in tag_year.iter_rows():
        ty[tag][year - TREND_YEARS.start] = n

    meta = {
        "snapshotDate": stats["snapshot_date"],
        "rawRows": stats["raw_rows"],
        "universeRows": stats["universe_rows"],
        "exclusions": stats["exclusions"],
        "minReviews": config.MIN_REVIEWS_UNIVERSE,
        "priceOutlierUsd": config.PRICE_OUTLIER_USD,
        "trendYears": list(TREND_YEARS),
        "launchesAllGames": [year_totals.get(y, 0) for y in TREND_YEARS],
        "tagLaunchesByYear": ty,
    }
    _dump(meta, config.WEB_DATA_DIR / "meta.json")
    return {"games": len(rows), "genres": len(genres), "tags": len(tags)}
