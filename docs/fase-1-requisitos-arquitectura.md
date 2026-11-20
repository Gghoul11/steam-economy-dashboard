# Fase 1 — Análisis de Requisitos y Arquitectura
## Ecosistema Steam: Economía del Gaming, Precios y Retención
**Autor:** Aldo Arceo Beltrán (desarrollo individual) · **Fecha:** 2026-11-20 · **Estado:** propuesta para aprobación (no se ha creado ni modificado ningún archivo del proyecto)

---

## 0. Contexto
Proyecto de portafolio: dashboard dinámico en React, desplegado públicamente, sobre la economía de Steam (precios, monetización, recepción y retención). Este documento es la base técnica del PDF de justificación de la Fase 1. Las Fases 2–4 (wireframes/KPIs, implementación, despliegue) parten de las decisiones aquí aprobadas.

---

## 1. Auditoría del entorno y del dataset

### 1.1 Estado del directorio `visualizacion_datos/`
| Elemento | Hallazgo |
|---|---|
| Archivos | Solo `Sin confirmar 213555.crdownload` (descarga de Chrome **en curso**, ~300 MB al momento de la auditoría y creciendo) |
| Git | El directorio **no** es repositorio git todavía |
| Código | Ninguno (proyecto en blanco) |
| Ubicación | Dentro de **OneDrive** → riesgo: sincronizar un CSV de cientos de MB y `node_modules` |

### 1.2 Identificación del archivo que se está descargando
Leyendo la cabecera del archivo parcial se identificó que **NO es** *Steam Store Games* (nik davis, 2019, ~27 k juegos), sino **"Steam Games Dataset" (FronkonGames, Kaggle) — `games.csv`**, versión reciente (incluye columna `Discount`).

**Recomendación: quedarnos con este dataset**, porque cubre mejor los objetivos:
| Necesidad del proyecto | Steam Store Games (2019) | Steam Games Dataset (FronkonGames) ✅ |
|---|---|---|
| Picos de jugadores (retención) | ❌ no existe | ✅ `Peak CCU` |
| Actualidad del mercado | Datos hasta 2019 | Datos hasta 2024–2025 |
| Volumen | ~27 k títulos | ~100 k+ títulos |
| Playtime promedio/mediana | ✅ | ✅ (forever y últimas 2 semanas) |
| Descuentos | ❌ | ✅ `Discount` |

### 1.3 Esquema observado (39 cabeceras / 40 campos de datos)
`AppID, Name, Release date, Estimated owners, Peak CCU, Required age, Price, DiscountDLC count, About the game, Supported languages, Full audio languages, Reviews, Header image, Website, Support url, Support email, Windows, Mac, Linux, Metacritic score, Metacritic url, User score, Positive, Negative, Score rank, Achievements, Recommendations, Notes, Average playtime forever, Average playtime two weeks, Median playtime forever, Median playtime two weeks, Developers, Publishers, Categories, Genres, Tags, Screenshots, Movies`

**⚠️ Hallazgo crítico de calidad:** la cabecera fusiona `Discount` y `DLC count` en `DiscountDLC count` (39 nombres) mientras cada fila trae **40 valores**. Si se lee con `pandas.read_csv` sin corregir, **todas las columnas posteriores quedan desplazadas una posición** (p. ej. `Positive` contendría `Negative`). El pipeline debe reescribir la cabecera explícitamente (`names=[...40 columnas...]`, `header=0`).

Otros hallazgos de la primera fila:
- `Release date` en formato texto `"Aug 1, 2023"` (y variantes `"Aug 2023"`, vacías).
- `Estimated owners` es un **rango textual** `"0 - 0"`, `"20000 - 50000"` (ordinal, no numérico).
- `Supported languages` serializado como lista Python `"['English', 'French']"`.
- `Developers, Publishers, Categories, Genres, Tags` como cadenas separadas por comas.
- Existen registros **Playtest/Demo** con métricas en cero (ruido).
- `Price` en USD con decimal (`0.0`).

### 1.4 Resultados del perfilado (`games.csv`, 401 MB, 2026-11-20)
- **125 855 filas**, todas con 40 campos; **0 AppID duplicados**; cabecera con el bug confirmado (39 nombres).
- Corrección de cabecera validada con juegos conocidos (CS2, Dota 2, Stardew Valley, ELDEN RING): valores coherentes.
- `Release date`: 100 % en formato `Mon D, YYYY`. Rango 1997–2026; 81 % del catálogo es de 2018 en adelante (2025: 24 973 lanzamientos).
- Segmentos: **Pago 78,8 %** (99 194) · **F2P 10,6 %** (13 298) · **Gratuito no-F2P 10,6 %** (13 363). Precio de pago: mediana $3,59, P90 $11,99, P99 $34,99; 317 > $100, 7 > $200, máx. $1 000.
- **`Price` es el precio vigente con descuento**, no el de lista (Stardew $8,99 con 40 % → lista $14,99; ELDEN RING $38,99 con 35 % → $59,99). 32 % de títulos tenían descuento activo.
- Datos SteamSpy muy dispersos: playtime = 0 en 79,2 %, Peak CCU = 0 en 84,4 %, owners `0 - 0` en 19,5 %; playtime máx. 3,4 M min (≈57 000 h, imposible).
- Reseñas: 42 899 sin reseñas; **56 662 con ≥ 10** (universo de indicadores de recepción); 22 804 con ≥ 100.
- Inutilizables: `Movies` (100 % vacío), `User score`/`Score rank` (≈ 99,97 % vacío), `Metacritic score` (96,6 % = 0), `Reviews` (90 % vacío).
- Multietiquetas: 33 géneros (6,7 % vacíos, incluye software: Utilities, Photo Editing, Accounting…), **452 tags (33,8 % vacíos)**, 58 categorías.
- Ruido: 8 243 nombres con playtest/demo/OST/server/SDK (incluye falsos positivos; revisar la regla).

**Ajustes al plan derivados del perfilado**
1. Derivar `list_price = price / (1 − discount/100)` y usarlo en todos los indicadores de precio; `price` queda como "precio observado".
2. Playtime = 0 y Peak CCU = 0 → `NULL` (sin dato de SteamSpy), no cero real; los KPIs de retención reportan su `n` (≈ 26 k títulos).
3. Fechas anteriores a 2003 **se conservan** (relanzamientos de clásicos) con bandera `pre_steam_release`, en lugar de anularse.
4. Excluir títulos de software (sin géneros de juego: Utilities, Design & Illustration, Video Production, etc.).
5. F2P detectado sobre géneros **y** tags, porque un tercio de los títulos no tiene tags.
6. Universo base para el dashboard: juegos con ≥ 10 reseñas (~56 k), lo que reduce además el tamaño en Supabase.

---

## 2. Base de datos y stack tecnológico

### 2.1 Comparativa de bases de datos
| Criterio | PostgreSQL | MongoDB | MySQL |
|---|---|---|---|
| Atributos multivaluados (géneros, tags, idiomas) | `text[]` + índice **GIN**, `unnest()`, operadores `@>`/`&&`; o tablas puente | Arrays nativos en documento | Solo JSON o tablas puente; sin índices de array nativos |
| Consultas analíticas (percentiles, ventanas, agrupación) | ✅ `percentile_cont`, `WINDOW`, `FILTER`, `GROUPING SETS`, vistas materializadas | Aggregation pipeline (verboso; percentiles limitados) | Ventanas sí; sin `percentile_cont` nativo ni vistas materializadas |
| Integridad / modelo relacional (dev ↔ publisher ↔ juego) | ✅ fuerte | Débil (desnormalizado) | ✅ |
| Cloud gratuito para producción | **Supabase** (500 MB, API REST automática), Neon | Atlas M0 (512 MB) | PlanetScale ya sin tier gratuito; opciones limitadas |
| Valor en portafolio | Estándar de la industria en analítica | Bueno para apps, menos para BI | Correcto pero menos diferenciador |

### 2.2 Recomendación única: **PostgreSQL alojado en Supabase**
1. **Modelo híbrido ideal para Steam:** tabla de hechos relacional + columnas `text[]` con índices GIN para géneros/tags/idiomas → filtros tipo "juegos con tag Roguelike **y** Co-op" en milisegundos, sin perder SQL analítico.
2. **SQL analítico nativo:** medianas y percentiles (clave para precios y playtime sesgados), funciones de ventana para tendencias por año, **vistas materializadas** para pre-agregar los KPIs del dashboard.
3. **Sin backend propio:** Supabase expone PostgREST + funciones RPC (`rpc('kpi_by_genre', {...})`) con clave `anon` de **solo lectura protegida por RLS** → el front estático en Vercel consulta directamente. Menos piezas = mantenible por una sola persona.
4. **Despliegue real en producción** (no BD local).

**Restricciones y mitigaciones**
- Límite 500 MB: **no se cargan** `About the game`, `Screenshots`, `Movies`, `Reviews`, URLs de soporte (solo se conserva `header_image` para tarjetas). Estimado < 100 MB con índices.
- Proyectos free se pausan tras ~7 días sin actividad → GitHub Action semanal (cron) que hace una consulta ligera; y como respaldo, un **snapshot JSON pre-agregado** en el front (fallback si la API no responde).
- Alternativa equivalente si se prefiere no depender de Supabase: Neon (Postgres serverless) + funciones serverless de Vercel.

### 2.3 Stack alrededor de React
| Capa | Elección | Justificación |
|---|---|---|
| Build / lenguaje | **Vite + React 18 + TypeScript** | Arranque rápido, tipado del esquema de datos (evita errores de columnas como el bug de la cabecera) |
| Visualización | **Apache ECharts** (`echarts-for-react`) | Scatter con decenas de miles de puntos (render Canvas, `large`/`progressive`), **heatmap**, **boxplot**, histogramas, `dataZoom` y brushing nativos; un solo motor para todos los gráficos estadísticos → estética coherente. (Recharts no maneja bien volumen ni heatmaps; D3 puro cuesta demasiado tiempo a un dev individual) |
| Estilos / UI | **Tailwind CSS + shadcn/ui** | Diseño consistente y profesional, componentes accesibles (filtros, selects, tabs) que se copian al repo sin dependencia pesada; tema claro/oscuro |
| Datos / API | **@supabase/supabase-js + TanStack Query** | Caché, reintentos y estados de carga declarativos; filtros globales → query keys |
| Estado de filtros | **Zustand** + sincronización con URL (query params) | Vistas compartibles ("link a este análisis") |
| ETL | **Python 3.12 + Polars (o pandas) + Pandera** | Limpieza reproducible y validación de esquema |
| Calidad | ESLint + Prettier, Vitest; GitHub Actions (lint + build) | Señal de profesionalismo en el repo |
| Despliegue | **Vercel** (front) + Supabase (BD) | Preview por cada PR, variables de entorno seguras |

---

## 3. Insumos metodológicos para el documento

### 3.1 Análisis de la audiencia
**Usuario primario:** *Product Strategist / Fundador de estudio o publisher indie* (equipos de 2–30 personas) que planea su próximo lanzamiento en Steam.
- **Decisiones que toma con el dashboard:**
  1. **Precio de lanzamiento**: en qué rango de precio se concentran los juegos mejor valorados de su género.
  2. **Modelo de monetización**: Free-to-Play vs. pago (y con/sin DLC) según género.
  3. **Selección de nicho**: géneros/tags con alta valoración y baja saturación (oferta vs. éxito).
  4. **Ventana de lanzamiento**: estacionalidad (mes/año) de lanzamientos y su rendimiento.
  5. **Expectativa de retención/engagement**: playtime mediano y picos de CCU esperables para su categoría.
- **Usuario secundario:** analista de mercado/inversionista que compara segmentos.
- **Granularidad requerida:** agregada por **género/tag × banda de precio × año/trimestre**, con capacidad de bajar a **nivel título** (top-N, dispersión) solo para benchmarking. No necesita datos en tiempo real; actualización por snapshot.

### 3.2 Objetivos
**Objetivo principal:** Proveer a estudios independientes una herramienta visual que relacione **precio, modelo de monetización, género y recepción** con indicadores de **retención (playtime, Peak CCU)** para fundamentar la estrategia de lanzamiento en Steam con evidencia.

**Problema que resuelve:** Steam recibe >10 000 lanzamientos al año; la mayoría de los indies fija precio y elige nicho por intuición o comparando un puñado de títulos. La información pública existe, pero está dispersa, sesgada por éxitos extremos (blockbusters, F2P masivos) y no segmentada. El dashboard **reduce la incertidumbre de lanzamiento** mostrando referencias robustas (medianas, percentiles) por segmento comparable.

Objetivos específicos (se convierten en KPIs en Fase 2): distribución de precios por género; tasa de reseñas positivas por banda de precio; playtime mediano por modelo de monetización; saturación de tags vs. éxito; tendencia anual de lanzamientos y precios.

### 3.3 Plan de preprocesamiento

#### a) Identificación y entendimiento de variables
| Variable (origen) | Formato crudo | Formato destino | Rol |
|---|---|---|---|
| `AppID` | int | `int` PK | Identificador |
| `Name` | texto | `text` | Etiqueta |
| `Release date` | `"Aug 1, 2023"` / `"Aug 2023"` | `date` + `release_year`, `release_month`, `date_precision` | Tiempo |
| `Price` | float USD | `numeric(8,2)` + `price_band` | Precio |
| `Discount` | int % | `smallint` | Precio |
| `DLC count` | int | `int` + `has_dlc` | Monetización |
| `Estimated owners` | `"20000 - 50000"` | `owners_min`, `owners_max`, `owners_mid`, `owners_bucket` (ordinal) | Tamaño de mercado |
| `Peak CCU` | int | `int` | Retención |
| `Positive`, `Negative` | int | + `total_reviews`, `positive_ratio`, `wilson_score` | Recepción |
| `Average/Median playtime forever` | min | `int` (minutos) + horas derivadas | Retención |
| `Metacritic score` | int (0 = ausente) | `smallint NULL` | Crítica |
| `Developers`, `Publishers` | CSV en texto | `text[]` (+ `is_self_published`) | Actor |
| `Genres`, `Categories`, `Tags` | CSV en texto | `text[]` normalizado | Segmentación |
| `Supported languages` | lista Python como texto | `text[]` + `n_languages` | Alcance |
| `Windows/Mac/Linux` | bool | `boolean` | Plataforma |

#### b) Limpieza
1. **Corrección de cabecera** (40 nombres explícitos) y validación de esquema con Pandera; abortar si una fila no tiene 40 campos.
2. **Duplicados:** deduplicar por `AppID` (conservar el registro con más reseñas).
3. **Ruido:** excluir títulos cuyo nombre contenga `Playtest`, `Demo`, `Soundtrack`, `Server`, `SDK`, y registros con `total_reviews = 0` **y** `owners_max = 0` (se reportan como excluidos, no se borran del raw).
4. **Fechas:** parseo multi-formato (`%b %d, %Y` → `%b %Y` → `%Y`); fechas imposibles (> fecha del snapshot o < 2003, año de lanzamiento de Steam) → `NULL`; marcar `date_precision` (día/mes/año).
5. **Faltantes:**
   - `Metacritic score = 0` y `User score = 0` → `NULL` (0 significa "sin dato", no calificación).
   - Métricas de conteo vacías → 0 solo cuando semánticamente es cero (p. ej. `DLC count`).
   - Géneros/tags vacíos → array vacío + bandera `has_genres = false` (no se imputan).
   - **No se imputan** precio ni playtime: se excluyen del indicador correspondiente y se documenta el `n`.
6. **Normalización de multietiquetas:** `split(',')` → `trim` → normalización Unicode (NFKC) → *case folding* para comparación conservando un *display name* canónico → diccionario de sinónimos (`"Rogue-like"` → `"Roguelike"`, `"Free to Play"` → `"Free To Play"`) → deduplicación dentro del array. Tags con frecuencia < 30 títulos se agrupan como `Other` en vistas agregadas.

#### c) Valores atípicos
**Segmentación de modelo de negocio (antes de cualquier estadística):**
| Segmento | Regla |
|---|---|
| **Free-to-Play** | `price = 0` **y** (`'Free To Play' ∈ genres` **o** `'Free to Play' ∈ tags`) |
| **Gratuito no-F2P** (freeware, prototipos) | `price = 0` sin la etiqueta F2P |
| **Pago** | `price > 0` |
| Sub-banda de pago | `<$5`, `$5–9.99`, `$10–19.99`, `$20–39.99`, `$40–59.99`, `≥$60` |

Los indicadores de precio **solo usan el segmento Pago**; mezclar F2P (precio 0) hundiría promedios y medianas.

**Playtime extremo:**
- Se reporta **mediana y P25–P75** por segmento, nunca la media sola (distribución log-normal fuertemente sesgada).
- Detección por **IQR en escala log** (`log1p(minutos)`) **dentro de cada género** — así un MMO/competitivo con 500 h no se trata como error, pero un narrativo con 500 h sí se marca.
- Valores físicamente imposibles (> 100 000 h promedio) → `NULL`.
- Para visualización: **winsorización P1–P99** solo en ejes de gráficos; los datos almacenados no se alteran (flag `is_playtime_outlier`).

**Precios anómalos:** precios > $200 o con patrón de placeholder (p. ej. $999.99) → `is_price_outlier = true`, excluidos de distribuciones de precio pero visibles en el detalle.

**Reseñas con poca muestra:** `positive_ratio` con 5 reseñas no es comparable con 50 000 → usar **límite inferior de Wilson (95 %)** para rankings y exigir `total_reviews ≥ 10` en indicadores de recepción.

**Peak CCU:** escala logarítmica en gráficos; top 1 % (CS2, Dota 2, PUBG) reportado como "líderes" aparte para no distorsionar agregados.

#### d) Integración (ETL)
```
Kaggle games.csv (raw, inmutable, fuera de git)
  → 01_extract.py      corrige cabecera, tipa columnas, guarda data/interim/games_raw.parquet
  → 02_clean.py        limpieza, normalización de arrays, segmentación, flags de outliers
  → 03_validate.py     Pandera: rangos, nulos, unicidad AppID; reporte de calidad (n excluidos por regla)
  → data/processed/games_clean.parquet  +  quality_report.md
  → 04_load.py         COPY a Postgres (Supabase) en tabla de staging → upsert a `games`
  → SQL migrations     índices GIN en arrays, B-tree en release_year/price_band/segment,
                       vistas materializadas (mv_genre_kpis, mv_price_band_kpis, mv_yearly_trends, mv_tag_saturation)
                       funciones RPC parametrizadas por filtros, RLS de solo lectura
  → 05_snapshot.py     exporta agregados a JSON (fallback estático del front)
```
Idempotente y reproducible (`make etl` o `python -m etl.run`); el CSV crudo nunca se versiona.

### 3.4 Justificación del tipo de dashboard: **Estratégico**
| Tipo | Característica | ¿Encaja? |
|---|---|---|
| Operativo | Monitoreo en tiempo real, decisiones del día a día | ❌ Datos son un snapshot; no hay operación que vigilar |
| Táctico | Seguimiento de iniciativas/campañas a mediano plazo frente a metas | Parcial: no monitorea un proyecto propio en curso |
| **Estratégico** | Tendencias de largo plazo, comparación de mercado, decisiones de alto impacto y baja frecuencia | ✅ |

Argumento: las decisiones que habilita (precio, nicho, monetización, ventana de lanzamiento) se toman **una vez por proyecto**, con horizonte de 1–3 años, por la dirección del estudio; se basan en **tendencias históricas agregadas** (2003–2025) y **benchmarks de mercado**, no en métricas en vivo. Incorpora un componente **analítico** (filtros cruzados y exploración por segmento) que apoya la estrategia sin convertirlo en táctico.

---

## 4. Estructura del repositorio y README

### 4.1 Árbol de carpetas propuesto
> Recomendación: mover el proyecto **fuera de OneDrive** (p. ej. `C:\dev\steam-economy-dashboard`) o excluir `data/` y `node_modules/` de la sincronización.
```
steam-economy-dashboard/
├── README.md
├── LICENSE                      # MIT (código); datos bajo licencia del dataset original
├── .gitignore                   # data/raw, data/interim, .env, node_modules
├── .env.example                 # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, DATABASE_URL
├── .github/workflows/
│   ├── ci.yml                   # lint + test + build
│   └── keepalive.yml            # ping semanal a Supabase
├── docs/
│   ├── fase-1-requisitos.pdf
│   ├── fase-2-wireframes/
│   ├── data-dictionary.md
│   └── architecture.md          # diagrama de arquitectura
├── data/
│   ├── raw/                     # games.csv (ignorado por git)
│   ├── interim/                 # parquet intermedio (ignorado)
│   └── processed/               # agregados ligeros versionables
├── etl/
│   ├── requirements.txt
│   ├── config.py
│   ├── 01_extract.py … 05_snapshot.py
│   ├── schemas.py               # Pandera
│   └── notebooks/eda.ipynb      # exploración documentada
├── database/
│   ├── migrations/              # 001_schema.sql, 002_indexes.sql, 003_views.sql, 004_rpc.sql, 005_rls.sql
│   └── seed/
└── web/
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── public/data/             # snapshot JSON de respaldo
    └── src/
        ├── app/                 # rutas y layout
        ├── components/ui/       # shadcn/ui
        ├── components/charts/   # wrappers de ECharts
        ├── features/            # pricing/, genres/, retention/, trends/
        ├── hooks/               # useKpis, useFilters
        ├── lib/                 # supabaseClient, formatters, theme
        ├── store/               # filtros globales (Zustand)
        └── types/               # tipos del esquema
```

### 4.2 Propuesta de `README.md`
```markdown
# 🎮 Ecosistema Steam: Economía del Gaming, Precios y Retención

Dashboard estratégico e interactivo que analiza más de 100 000 títulos de Steam para
responder una pregunta clave de cualquier estudio independiente:
**¿a qué precio, con qué modelo de monetización y en qué nicho conviene lanzar un juego?**

🔗 **Demo:** _(pendiente — Fase 4)_

## Problema
Cada año se publican más de 10 000 juegos en Steam. Las decisiones de precio y nicho
suelen tomarse por intuición. Este dashboard transforma datos públicos del catálogo en
benchmarks robustos (medianas, percentiles, score de Wilson) segmentados por género,
banda de precio y modelo de negocio.

## Funcionalidades (planeadas)
- Distribución de precios por género y modelo (F2P vs. pago)
- Recepción (reseñas positivas) por banda de precio
- Retención: playtime mediano y picos de jugadores concurrentes
- Saturación de tags vs. éxito (heatmap)
- Tendencias anuales de lanzamientos y precios
- Filtros globales compartibles por URL

## Stack
| Capa | Tecnología |
|---|---|
| Frontend | React 18 · TypeScript · Vite |
| Visualización | Apache ECharts |
| UI | Tailwind CSS · shadcn/ui |
| Datos en cliente | TanStack Query · Zustand |
| Base de datos | PostgreSQL (Supabase) — vistas materializadas + RPC |
| ETL | Python · Polars · Pandera |
| CI/CD y hosting | GitHub Actions · Vercel |

## Datos
Fuente: *Steam Games Dataset* (FronkonGames, Kaggle). El archivo crudo no se incluye
en el repositorio; ver `etl/README` para reproducir el pipeline.

## Metodología
Proyecto desarrollado en 4 fases:
1. Análisis de requisitos y arquitectura
2. Diseño de wireframes y KPIs
3. Implementación (ETL + dashboard)
4. Despliegue y documentación final

## Estructura
`etl/` pipeline de datos · `database/` migraciones SQL · `web/` aplicación React · `docs/` entregables

## Autor
**Aldo Arceo Beltrán** — proyecto individual (análisis, ingeniería de datos y desarrollo frontend).

## Licencia
Código bajo MIT. Los datos pertenecen a sus autores originales bajo la licencia del dataset.
```

---

## 5. Verificación (al ejecutar en fases siguientes)
- Al terminar la descarga: script de perfilado de solo lectura → nº filas, columnas = 40, % nulos, distribución de `Price`/`Peak CCU`; confirmar que `Positive` ≥ 0 y `Positive`/`Negative` no están desplazados (prueba del bug de cabecera con un AppID conocido, p. ej. 730 CS2).
- `03_validate.py` debe pasar sin errores y el `quality_report.md` debe justificar cada exclusión.
- Comparar 3–5 juegos conocidos contra su página de Steam (precio, género) como prueba de sanidad.
- Medir tamaño de la BD en Supabase (< 150 MB) y latencia de RPC (< 300 ms).

## 6. Siguiente paso
Tras tu aprobación → **Fase 2: Diseño de Wireframe y KPIs** (definición formal de KPIs, fórmulas, layout y flujo de interacción).
