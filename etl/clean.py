"""Paso 2 — Limpieza, normalización, segmentación y marcas de valores atípicos."""
from datetime import timedelta

import polars as pl

from . import config

INT_COLS = [
    "app_id", "peak_ccu", "required_age", "discount", "dlc_count", "metacritic_score",
    "positive", "negative", "achievements", "recommendations",
    "average_playtime_forever", "median_playtime_forever",
]


def _to_list(col: str) -> pl.Expr:
    return pl.col(col).fill_null("").str.split(",")


def normalize_labels(df: pl.DataFrame, col: str) -> pl.DataFrame:
    """Separa una cadena multietiqueta y la reemplaza por una lista canónica sin duplicados.

    Canonización: trim → NFKC → comparación sin mayúsculas → sinónimos explícitos o,
    si no hay, la grafía más frecuente del dataset.
    """
    exploded = (
        df.select("app_id", _to_list(col).alias("v"))
        .explode("v")
        .with_columns(pl.col("v").str.strip_chars().str.normalize("NFKC"))
        .filter(pl.col("v").is_not_null() & (pl.col("v") != ""))
        .with_columns(pl.col("v").str.to_lowercase().alias("k"))
    )
    freq = (
        exploded.group_by("k", "v").len()
        .sort(["k", "len", "v"], descending=[False, True, False])
        .group_by("k", maintain_order=True).first()
    )
    canon = {k: config.LABEL_SYNONYMS.get(k, v) for k, v in freq.select("k", "v").iter_rows()}
    canon_df = pl.DataFrame({"k": list(canon), "canon": list(canon.values())})
    lists = (
        exploded.join(canon_df, on="k", how="left")
        .group_by("app_id", maintain_order=True)
        .agg(pl.col("canon").unique(maintain_order=True).alias(col))
    )
    return (
        df.drop(col).join(lists, on="app_id", how="left")
        .with_columns(pl.col(col).fill_null(pl.lit([], dtype=pl.List(pl.String))))
    )


def _snap_99(v: pl.Expr) -> pl.Expr:
    """Precio reconstruido 59.98 → 59.99 (redondeo por la división del descuento)."""
    frac = v - v.floor()
    return pl.when(frac >= 0.94).then(v.floor() + 0.99).otherwise(v.round(2))


def clean(raw: pl.DataFrame) -> tuple[pl.DataFrame, dict]:
    stats: dict = {"raw_rows": raw.height}

    df = raw.drop(config.DROP_COLUMNS)
    df = df.with_columns(
        [pl.col(c).cast(pl.Int64, strict=False) for c in INT_COLS]
        + [
            pl.col("price").cast(pl.Float64, strict=False),
            *[pl.col(c).str.to_lowercase().eq("true").alias(c) for c in ("windows", "mac", "linux")],
            pl.col("name").str.strip_chars(),
            pl.coalesce(
                pl.col("release_date_raw").str.strptime(pl.Date, "%b %d, %Y", strict=False),
                pl.col("release_date_raw").str.strptime(pl.Date, "%b %Y", strict=False),
            ).alias("release_date"),
        ]
    )

    # Duplicados: conservar el registro con más reseñas
    before = df.height
    df = (
        df.sort(pl.col("positive") + pl.col("negative"), descending=True)
        .unique(subset="app_id", keep="first", maintain_order=True)
        .sort("app_id")
    )
    stats["duplicates_removed"] = before - df.height

    for col in ("genres", "tags", "categories", "developers", "publishers"):
        df = normalize_labels(df, col)

    df = df.with_columns(
        pl.col("supported_languages")
        .fill_null("")
        .str.replace_all(r"[\[\]']|&amp;lt;.*?&amp;gt;|<[^>]+>|\[/?b\]|\*", "")
        .str.split(",")
        .list.eval(pl.element().str.strip_chars())
        .list.eval(pl.element().filter(pl.element() != ""))
        .alias("languages"),
        pl.col("estimated_owners").str.split(" - ").list.get(0, null_on_oob=True)
        .cast(pl.Int64, strict=False).alias("owners_min"),
        pl.col("estimated_owners").str.split(" - ").list.get(1, null_on_oob=True)
        .cast(pl.Int64, strict=False).alias("owners_max"),
    ).drop("supported_languages")

    # --- Métricas derivadas -------------------------------------------------------------
    z = 1.96
    n = pl.col("positive") + pl.col("negative")
    p = pl.col("positive") / n
    wilson = (p + z**2 / (2 * n) - z * ((p * (1 - p) + z**2 / (4 * n)) / n).sqrt()) / (1 + z**2 / n)

    raw_list = pl.col("price") / (1 - pl.col("discount") / 100)
    df = df.with_columns(
        n.alias("total_reviews"),
        pl.when(n > 0).then(p).alias("positive_ratio"),
        pl.when(n > 0).then(wilson * 100).alias("wilson_score"),
        pl.when((pl.col("discount") > 0) & (pl.col("discount") < 100) & (pl.col("price") > 0))
        .then(_snap_99(raw_list)).otherwise(pl.col("price")).alias("list_price"),
        # Fase 1 §1.4: 0 en SteamSpy significa "sin dato", no "cero"
        pl.when(pl.col("median_playtime_forever") > 0)
        .then(pl.col("median_playtime_forever") / 60).alias("median_playtime_h"),
        pl.when(pl.col("average_playtime_forever") > 0)
        .then(pl.col("average_playtime_forever") / 60).alias("average_playtime_h"),
        pl.when(pl.col("peak_ccu") > 0).then(pl.col("peak_ccu")).alias("peak_ccu"),
        pl.when(pl.col("metacritic_score") > 0).then(pl.col("metacritic_score")).alias("metacritic_score"),
        (pl.col("owners_min") + pl.col("owners_max")).floordiv(2).alias("owners_mid"),
        pl.col("languages").list.len().alias("n_languages"),
        (pl.col("dlc_count") > 0).alias("has_dlc"),
        pl.col("genres").list.contains("Indie").alias("is_indie"),
        (pl.col("developers").list.set_intersection("publishers").list.len() > 0).alias("is_self_published"),
        pl.col("release_date").dt.year().alias("release_year"),
        pl.col("release_date").dt.month().alias("release_month"),
    )

    implausible = pl.col("median_playtime_h") > config.PLAYTIME_MAX_PLAUSIBLE_H
    stats["playtime_implausible_nulled"] = df.filter(implausible).height
    df = df.with_columns(
        pl.when(implausible).then(None).otherwise(pl.col("median_playtime_h")).alias("median_playtime_h"),
        pl.when(pl.col("average_playtime_h") > config.PLAYTIME_MAX_PLAUSIBLE_H)
        .then(None).otherwise(pl.col("average_playtime_h")).alias("average_playtime_h"),
    )

    # --- Segmentación de modelo de negocio -------------------------------------------------
    is_f2p = pl.col("genres").list.contains(config.F2P_LABEL) | pl.col("tags").list.contains(config.F2P_LABEL)
    df = df.with_columns(
        pl.when(pl.col("list_price") > 0).then(pl.lit("Pago"))
        .when(is_f2p).then(pl.lit("F2P"))
        .otherwise(pl.lit("Gratis")).alias("business_model"),
        (pl.col("list_price") > config.PRICE_OUTLIER_USD).alias("is_price_outlier"),
    )
    band = pl.lit(None, dtype=pl.String)
    for lo, hi, label in reversed(config.PRICE_BANDS):
        band = pl.when((pl.col("list_price") >= lo) & (pl.col("list_price") < hi)).then(pl.lit(label)).otherwise(band)
    df = df.with_columns(band.alias("price_band"))

    # Género principal: primer género temático (no Indie / Early Access / F2P)
    df = df.with_columns(
        pl.col("genres").list.eval(
            pl.element().filter(
                pl.element().is_in(list(config.GAME_GENRES - config.NON_THEMATIC_GENRES))
            )
        ).list.first().alias("primary_genre")
    ).with_columns(
        pl.coalesce("primary_genre", pl.col("genres").list.first()).alias("primary_genre")
    )

    # --- Exclusiones del universo analítico (se marcan, no se borran) ------------------
    is_game = pl.col("genres").list.set_intersection(list(config.GAME_GENRES)).list.len() > 0
    df = df.with_columns(
        pl.when(pl.col("name").str.contains(config.NOISE_PATTERN)).then(pl.lit("ruido"))
        .when(~is_game).then(pl.lit("software"))
        .when(pl.col("release_date").is_null()).then(pl.lit("sin_fecha"))
        .when(pl.col("total_reviews") < config.MIN_REVIEWS_UNIVERSE).then(pl.lit("pocas_resenas"))
        .alias("exclusion_reason")
    ).with_columns(pl.col("exclusion_reason").is_null().alias("in_universe"))

    # Fecha del snapshot: último lanzamiento que ya recibió reseñas
    snapshot = df.filter(pl.col("total_reviews") > 0)["release_date"].max()
    stats["snapshot_date"] = snapshot.isoformat()
    df = df.with_columns(
        (pl.col("release_date") <= snapshot - timedelta(days=config.MATURITY_DAYS)).fill_null(False).alias("is_mature"),
        (pl.col("release_year") < config.STEAM_LAUNCH_YEAR).fill_null(False).alias("pre_steam_release"),
    )

    # Outliers de horas: IQR sobre log1p(horas) dentro del género principal (solo universo)
    log_h = pl.col("median_playtime_h").log1p()
    q1 = log_h.quantile(0.25).over("primary_genre")
    q3 = log_h.quantile(0.75).over("primary_genre")
    iqr = q3 - q1
    flag = df.filter(pl.col("in_universe")).select(
        "app_id",
        ((log_h < q1 - 1.5 * iqr) | (log_h > q3 + 1.5 * iqr)).fill_null(False).alias("is_playtime_outlier"),
    )
    df = df.join(flag, on="app_id", how="left").with_columns(pl.col("is_playtime_outlier").fill_null(False))

    stats["exclusions"] = dict(
        df.group_by("exclusion_reason").len().filter(pl.col("exclusion_reason").is_not_null()).iter_rows()
    )
    stats["universe_rows"] = df.filter(pl.col("in_universe")).height

    df = df.drop("release_date_raw", "estimated_owners", "median_playtime_forever", "average_playtime_forever")
    config.PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    df.write_parquet(config.CLEAN_PARQUET)
    return df, stats
