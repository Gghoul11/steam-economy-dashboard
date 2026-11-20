# 🎮 Ecosistema Steam: Economía del Gaming, Precios y Retención

[![CI](https://github.com/Gghoul11/steam-economy-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/Gghoul11/steam-economy-dashboard/actions/workflows/ci.yml)
[![Demo](https://img.shields.io/badge/demo-aldo--steam--dashboard.vercel.app-2a78d6)](https://aldo-steam-dashboard.vercel.app/)

Dashboard estratégico e interactivo que analiza **55 918 juegos de Steam** (de un catálogo de 125 855)
para responder una pregunta clave de cualquier estudio independiente:
**¿a qué precio, con qué modelo de monetización y en qué nicho conviene lanzar un juego?**

🔗 **Demo en vivo:** https://aldo-steam-dashboard.vercel.app/

## Problema
Cada año se publican más de 20 000 juegos en Steam. Las decisiones de precio y nicho suelen tomarse
por intuición o comparando un puñado de títulos. Este dashboard transforma los datos públicos del
catálogo en referencias robustas (medianas, percentiles, límite inferior de Wilson), segmentadas por
género, tag, banda de precio y modelo de negocio.

## Funcionalidades
- **Panorama:** KPIs de cabecera comparados contra todo Steam, lanzamientos y tendencias anuales, estacionalidad.
- **Precio y modelo:** recepción por banda de precio, distribución de precio por género, dispersión precio-recepción, prima de DLC.
- **Nichos:** mapa de oportunidad (saturación vs. recepción), mapa de calor de oferta por tag y año, tabla explorable.
- **Retención:** horas de juego por modelo y por precio, horas vs. recepción, líderes de jugadores concurrentes.
- **Evalúa tu concepto:** el usuario describe su juego (género, tags, precio) y ve en qué percentil queda frente a juegos comparables.
- Filtros globales compartibles por URL, filtrado cruzado con clic, vista de tabla en cada gráfica, tema claro/oscuro.

## Stack
| Capa | Tecnología |
|---|---|
| Frontend | React 19 · TypeScript · Vite |
| Visualización | Apache ECharts 6 |
| UI | Tailwind CSS 4 (componentes propios accesibles) |
| Datos en cliente | TanStack Query · Zustand |
| Base de datos | PostgreSQL (Supabase): arrays + GIN, vistas materializadas, RPC, RLS de solo lectura |
| ETL | Python · Polars · Pandera |
| Calidad | Vitest · oxlint · GitHub Actions |
| Hosting | Vercel |

## Arquitectura (híbrida)
```
games.csv ─► etl/ (extract → clean → validate → load → snapshot)
                     │                          │
                     ▼                          ▼
          PostgreSQL / Supabase       web/public/data/*.json
          (vistas + RPC + RLS)        (snapshot en el CDN de Vercel)
                     │                          │
       consultas en vivo (RPC)        gráficos: motor de KPIs en el navegador
                     └──────────┬───────────────┘
                                ▼
                         web/ React (Vercel)
```
- **Gráficos:** se calculan en el navegador sobre el snapshot (55 918 juegos, 2,2 MB comprimido), así cualquier combinación de filtros responde al instante.
- **Consultas en vivo:** "Evalúa tu concepto" ejecuta `rpc_concept_benchmark` en PostgreSQL; si Supabase no responde, usa el mismo cálculo localmente (una prueba garantiza que ambos coinciden).
- **Por qué híbrido:** descargar 56 k filas por la API REST del plan gratuito excede su límite de 3 s por consulta. Detalle en [`docs/fase-4-despliegue.md`](docs/fase-4-despliegue.md).

## Ejecutar en local
```powershell
# 1) ETL (requiere data/raw/games.csv)
python -m venv etl\.venv
etl\.venv\Scripts\python -m pip install -r etl\requirements.txt
etl\.venv\Scripts\python -m etl.run

# 2) Dashboard
cd web
npm install
npm run dev        # http://localhost:5173
npm test           # pruebas unitarias + criterios de aceptación con datos reales
```

## Documentación
| Documento | Contenido |
|---|---|
| [Fase 1 · Requisitos y arquitectura](docs/fase-1-requisitos-arquitectura.md) | Audiencia, objetivos, auditoría del dataset, stack, preprocesamiento |
| [Fase 2 · Wireframes y KPIs](docs/fase-2-wireframes-kpis.md) | Catálogo de 15 KPIs, wireframes, lineamientos visuales |
| [Fase 3 · Implementación](docs/fase-3-implementacion.md) | ETL, base de datos, front, pruebas y desviaciones justificadas |
| [Fase 4 · Despliegue](docs/fase-4-despliegue.md) | Producción, seguridad, verificación y mantenimiento |
| [Arquitectura](docs/architecture.md) · [Diccionario de datos](docs/data-dictionary.md) | Diagramas y las 47 columnas de `public.games` |

## Datos
Fuente: *Steam Games Dataset* (FronkonGames, Kaggle), snapshot al 25-12-2025. El CSV crudo no se
incluye en el repositorio. Reglas de limpieza y reporte de calidad: [`etl/README.md`](etl/README.md) y
`data/processed/quality_report.md`.

## Metodología
Proyecto desarrollado en 4 fases, documentadas en [`docs/`](docs/):
1. Análisis de requisitos y arquitectura
2. Diseño de wireframes y KPIs
3. Implementación (ETL + dashboard)
4. Despliegue y documentación final

## Estructura
`etl/` pipeline de datos · `database/migrations/` SQL · `web/` aplicación React · `docs/` entregables

## Autor
**Aldo Arceo Beltrán** — proyecto individual (análisis, ingeniería de datos y desarrollo frontend).

## Licencia
Código bajo MIT. Los datos pertenecen a sus autores originales bajo la licencia del dataset.
