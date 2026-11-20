# Diccionario de datos · `public.games`

Una fila por título de Steam (125 855). Origen: *Steam Games Dataset* (FronkonGames), snapshot 25-12-2025.
"Derivada" = calculada por `etl/clean.py`.

## Identificación y tiempo
| Columna | Tipo | Origen | Regla |
|---|---|---|---|
| `app_id` | integer PK | `AppID` | Único; duplicados → se conserva el de más reseñas |
| `name` | text | `Name` | Recorte de espacios |
| `release_date` | date | `Release date` | Formatos `Mon D, YYYY` y `Mon YYYY` |
| `release_year`, `release_month` | smallint | Derivada | De `release_date` |
| `is_mature` | boolean | Derivada | ≥ 365 días antes del snapshot; usada en tendencias |
| `pre_steam_release` | boolean | Derivada | Año < 2003 (relanzamientos de clásicos) |

## Precio y monetización
| Columna | Tipo | Origen | Regla |
|---|---|---|---|
| `price` | numeric(8,2) | `Price` | Precio observado (con descuento) |
| `discount` | smallint | `Discount` | 0–100 |
| `list_price` | numeric(8,2) | Derivada | `price / (1 − discount/100)` ajustado a .99 |
| `price_band` | text | Derivada | `<$5`, `$5–9.99`, `$10–19.99`, `$20–39.99`, `$40–79.99`; nulo si gratis o atípico |
| `business_model` | text | Derivada | `Pago` (list_price > 0) · `F2P` (gratis con etiqueta Free to Play) · `Gratis` |
| `is_price_outlier` | boolean | Derivada | `list_price` > $80 |
| `dlc_count` / `has_dlc` | integer / boolean | `DLC count` | — |

## Recepción
| Columna | Tipo | Origen | Regla |
|---|---|---|---|
| `positive`, `negative` | integer | `Positive`, `Negative` | — |
| `total_reviews` | integer | Derivada | positive + negative |
| `positive_ratio` | real | Derivada | positive / total; nulo sin reseñas |
| `wilson_score` | real | Derivada | Límite inferior de Wilson 95 % × 100 |
| `metacritic_score` | smallint | `Metacritic score` | 0 → nulo |
| `recommendations` | integer | `Recommendations` | — |

## Retención y alcance
| Columna | Tipo | Origen | Regla |
|---|---|---|---|
| `median_playtime_h` | real | `Median playtime forever` | Minutos → horas; 0 → nulo; > 5 000 h → nulo |
| `average_playtime_h` | real | `Average playtime forever` | Igual que la anterior |
| `is_playtime_outlier` | boolean | Derivada | Fuera de 1,5·IQR de log1p(horas) en su género principal (solo universo) |
| `peak_ccu` | integer | `Peak CCU` | 0 → nulo |
| `owners_min`, `owners_max`, `owners_mid` | integer | `Estimated owners` | Rango textual "a - b" separado; mid = punto medio |
| `required_age`, `achievements` | smallint / integer | Originales | — |
| `windows`, `mac`, `linux` | boolean | Originales | — |
| `header_image` | text | `Header image` | URL de portada |

## Atributos multivaluados (índices GIN)
| Columna | Tipo | Origen | Regla |
|---|---|---|---|
| `genres`, `categories`, `tags` | text[] | Cadenas separadas por comas | trim → NFKC → canonización sin mayúsculas → sinónimos → sin duplicados |
| `developers`, `publishers` | text[] | Ídem | — |
| `languages` / `n_languages` | text[] / smallint | `Supported languages` | Lista serializada → arreglo; se eliminan marcas HTML |
| `primary_genre` | text | Derivada | Primer género temático (excluye Indie, Early Access, Free to Play) |
| `is_indie` | boolean | Derivada | 'Indie' ∈ genres |
| `is_self_published` | boolean | Derivada | Intersección no vacía entre developers y publishers |

## Universo analítico
| Columna | Tipo | Regla |
|---|---|---|
| `exclusion_reason` | text | `ruido` (playtest/demo/soundtrack) · `software` (sin género de juego) · `sin_fecha` · `pocas_resenas` (< 10) |
| `in_universe` | boolean | `exclusion_reason` nulo → 55 918 juegos |

## Columnas descartadas
`About the game`, `Full audio languages`, `Reviews`, `Website`, `Support url`, `Support email`, `Metacritic url`, `User score` (≈ 100 % en 0), `Score rank` (≈ 100 % vacío), `Notes`, `Screenshots`, `Movies` (100 % vacío), playtime de las últimas dos semanas.
