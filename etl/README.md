# ETL · Steam Games Dataset → PostgreSQL + snapshot JSON

## Requisitos
- Python 3.12+
- `data/raw/games.csv` — *Steam Games Dataset* (FronkonGames, Kaggle)

```powershell
python -m venv etl\.venv
etl\.venv\Scripts\python -m pip install -r etl\requirements.txt
etl\.venv\Scripts\python -m etl.run            # genera Parquet, reporte y JSON del front
etl\.venv\Scripts\python -m etl.run --load     # además carga a PostgreSQL (DATABASE_URL en .env)
```

## Pasos
| Módulo | Qué hace |
|---|---|
| `extract.py` | Verifica el defecto de la cabecera (`DiscountDLC count`: 39 nombres para 40 valores) y la reemplaza por 40 nombres explícitos |
| `clean.py` | Tipado, fechas, normalización de géneros/tags/idiomas, precio de lista, Wilson, segmentación Pago/F2P/Gratis, bandas de precio, marcas de atípicos y exclusiones |
| `validate.py` | Esquema Pandera + reglas de negocio cruzadas → `data/processed/quality_report.md` |
| `load.py` | Migraciones SQL → COPY a staging → upsert → refresco de vistas materializadas |
| `snapshot.py` | `web/public/data/games.json` (universo, columnar) y `meta.json` (oferta por año y por tag) |

## Reglas clave
- **Universo analítico:** sin ruido (playtest/demo/soundtrack), con género de juego y ≥ 10 reseñas → 55 918 juegos.
- **Precio de lista:** `price / (1 − discount/100)`, ajustado a .99 (el dataset trae el precio con descuento).
- **Sin dato ≠ cero:** horas y Peak CCU en 0 se tratan como nulos.
- **Atípicos:** precio > $80; horas fuera de 1,5·IQR en escala log dentro del género principal; horas > 5 000 h se anulan.
- **Tendencias:** solo cohortes con ≥ 12 meses respecto al snapshot (25-12-2025).
