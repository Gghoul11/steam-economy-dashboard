# 🎮 Ecosistema Steam: Economía del Gaming, Precios y Retención

Dashboard estratégico e interactivo que analiza **55 918 juegos de Steam** (de un catálogo de 125 855)
para responder una pregunta clave de cualquier estudio independiente:
**¿a qué precio, con qué modelo de monetización y en qué nicho conviene lanzar un juego?**

🔗 **Demo:** _(pendiente — Fase 4)_

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

## Arquitectura
```
games.csv ─► etl/ (extract → clean → validate → load → snapshot)
                     │                          │
                     ▼                          ▼
          PostgreSQL / Supabase       web/public/data/*.json
          (vistas + RPC + RLS)        (snapshot estático)
                     └──────────┬───────────────┘
                                ▼
                 web/ React: motor de KPIs en el navegador
```
El front intenta leer Supabase si existen `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`; si no están
o la base no responde, usa el snapshot estático, así que la demo funciona siempre.

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
