"""Paso 3 — Validación de esquema (Pandera) y reporte de calidad."""
import pandera.polars as pa
import polars as pl

from . import config

BANDS = [b for _, _, b in config.PRICE_BANDS]

SCHEMA = pa.DataFrameSchema(
    {
        "app_id": pa.Column(pl.Int64, unique=True, nullable=False),
        "name": pa.Column(pl.String, nullable=False),
        "list_price": pa.Column(pl.Float64, pa.Check.ge(0), nullable=False),
        "discount": pa.Column(pl.Int64, pa.Check.in_range(0, 100)),
        "positive": pa.Column(pl.Int64, pa.Check.ge(0)),
        "negative": pa.Column(pl.Int64, pa.Check.ge(0)),
        "wilson_score": pa.Column(pl.Float64, pa.Check.in_range(0, 100), nullable=True),
        "positive_ratio": pa.Column(pl.Float64, pa.Check.in_range(0, 1), nullable=True),
        "median_playtime_h": pa.Column(
            pl.Float64, pa.Check.in_range(0, config.PLAYTIME_MAX_PLAUSIBLE_H), nullable=True
        ),
        "peak_ccu": pa.Column(pl.Int64, pa.Check.gt(0), nullable=True),
        "business_model": pa.Column(pl.String, pa.Check.isin(["Pago", "F2P", "Gratis"])),
        "price_band": pa.Column(pl.String, pa.Check.isin(BANDS), nullable=True),
        "release_year": pa.Column(pl.Int32, pa.Check.in_range(1980, 2030), nullable=True),
    },
    strict=False,
)


def validate(df: pl.DataFrame, stats: dict) -> None:
    SCHEMA.validate(df, lazy=True)

    u = df.filter(pl.col("in_universe"))
    # Reglas de negocio cruzadas
    assert u.filter((pl.col("business_model") == "Pago") & (pl.col("list_price") <= 0)).is_empty()
    assert u.filter(pl.col("total_reviews") < config.MIN_REVIEWS_UNIVERSE).is_empty()
    assert u.filter(pl.col("price_band").is_not_null() & (pl.col("business_model") != "Pago")).is_empty()

    def med(expr):
        return u.select(expr.median()).item()

    paid = pl.col("list_price").filter((pl.col("business_model") == "Pago") & ~pl.col("is_price_outlier"))
    excl = stats["exclusions"]
    lines = [
        "# Reporte de calidad del pipeline",
        "",
        f"- Snapshot del dataset (último lanzamiento con reseñas): **{stats['snapshot_date']}**",
        f"- Filas crudas: **{stats['raw_rows']:,}** · duplicados eliminados: {stats['duplicates_removed']}",
        f"- Horas de juego inverosímiles (> {config.PLAYTIME_MAX_PLAUSIBLE_H:,} h) anuladas: {stats['playtime_implausible_nulled']}",
        "",
        "## Exclusiones del universo analítico",
        "| Regla | Títulos |",
        "|---|---|",
        f"| Ruido (playtest, demo, soundtrack) | {excl.get('ruido', 0):,} |",
        f"| Software / sin género de juego | {excl.get('software', 0):,} |",
        f"| Sin fecha de lanzamiento | {excl.get('sin_fecha', 0):,} |",
        f"| Menos de {config.MIN_REVIEWS_UNIVERSE} reseñas | {excl.get('pocas_resenas', 0):,} |",
        f"| **Universo analítico** | **{stats['universe_rows']:,}** |",
        "",
        "## KPIs de referencia del universo",
        "| KPI | Valor | n |",
        "|---|---|---|",
        f"| Precio de lista mediano (pago, sin atípicos) | ${med(paid):.2f} | {u.select(paid.count()).item():,} |",
        f"| Recepción mediana (Wilson) | {med(pl.col('wilson_score')):.1f} | {u.height:,} |",
        f"| Horas medianas | {med(pl.col('median_playtime_h')):.1f} h | {u['median_playtime_h'].count():,} |",
        f"| Proporción F2P | {100 * u.filter(pl.col('business_model') == 'F2P').height / u.height:.1f} % | {u.height:,} |",
        "",
        "## Marcas de valores atípicos (dentro del universo)",
        f"- Precio > ${config.PRICE_OUTLIER_USD:.0f}: {u['is_price_outlier'].sum():,}",
        f"- Horas fuera de 1,5·IQR (log, por género principal): {u['is_playtime_outlier'].sum():,}",
        f"- Lanzamientos previos a {config.STEAM_LAUNCH_YEAR}: {u['pre_steam_release'].sum():,}",
        f"- Cohortes maduras (≥ {config.MATURITY_DAYS} días): {u['is_mature'].sum():,}",
    ]
    config.QUALITY_REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
