# Fase 3 — Implementación
## Ecosistema Steam: Economía del Gaming, Precios y Retención
**Autor:** Aldo Arceo Beltrán (desarrollo individual) · **Fecha:** 2026-11-20 · **Estado:** aprobada tras revisión visual

---

## 1. Resumen
| Componente | Resultado |
|---|---|
| ETL (Python · Polars · Pandera) | 125 855 títulos procesados en ≈ 3 s (≈ 42 s con carga a PostgreSQL); universo de 55 918 juegos |
| Base de datos (PostgreSQL 17 · Supabase) | 5 migraciones: tabla con arrays + GIN, 4 vistas materializadas, 2 funciones RPC, RLS de solo lectura |
| Dashboard (React 19 · ECharts 6 · Tailwind 4) | 4 vistas + panel "Evalúa tu concepto", 15 KPIs, filtros globales en la URL |
| Pruebas | 14 pruebas (Vitest): unitarias, criterios de aceptación con datos reales y paridad local ↔ PostgreSQL |
| CI | GitHub Actions: lint (oxlint) + pruebas + build en cada push |

## 2. Pipeline de datos
| Paso | Módulo | Decisiones clave |
|---|---|---|
| Extracción | `etl/extract.py` | Detecta el defecto de cabecera (`DiscountDLC count`) y aborta si el formato cambia; reemplaza por 40 nombres explícitos |
| Limpieza | `etl/clean.py` | Precio de lista = `price / (1 − discount/100)` ajustado a .99; Wilson al 95 %; 0 en horas/CCU → nulo; canonización de etiquetas (NFKC, mayúsculas, sinónimos); segmentación Pago / F2P / Gratis; atípicos de precio (> $80) y de horas (1,5·IQR en log por género principal) |
| Validación | `etl/validate.py` | Esquema Pandera + reglas cruzadas; genera `data/processed/quality_report.md` |
| Carga | `etl/load.py` | Migraciones → COPY a staging → upsert → borrado anti-join → refresco de vistas, todo en una transacción |
| Snapshot | `etl/snapshot.py` | `games.json` columnar con diccionarios de géneros/tags (7,2 MB; 2,2 MB comprimido) y `meta.json` |

### Resultados del reporte de calidad
| Regla | Títulos |
|---|---|
| Ruido (playtest, demo, soundtrack) | 8 209 |
| Software / sin género de juego | 1 497 |
| Menos de 10 reseñas | 60 231 |
| **Universo analítico** | **55 918** |

KPIs de referencia reproducidos exactamente: precio de lista mediano **$5,99**, Wilson mediano **68,9**, horas medianas **3,4 h** (n = 23 557), F2P **8,8 %**. Snapshot del dataset: **25-12-2025**.

## 3. Dashboard
| Vista | KPIs | Gráficos |
|---|---|---|
| Panorama | K1–K5, K12 | Fila de KPIs vs. Steam, lanzamientos por año, precio y Wilson por año, estacionalidad |
| Precio y modelo | K6, K7, K13, K14 | Wilson por banda (clic filtra), cajas de precio por género, dispersión precio-Wilson, prima de DLC |
| Nichos | K8, K9 | Mapa de oportunidad, mapa de calor tag × año, tabla ordenable de tags |
| Retención | K10, K11 | Cajas de horas por modelo, horas por banda, dispersión horas-Wilson, líderes de CCU |
| Evalúa tu concepto | K15 | Percentil de precio frente a comparables, en vivo desde PostgreSQL |

Interacción: filtros globales sincronizados con la URL, filtrado cruzado por clic, "Ver tabla" en cada gráfica, aviso con n < 30, tema claro/oscuro, transición sin parpadeo al refiltrar.

Accesibilidad visual: paleta de 3 colores validada con el script de daltonismo (separación CVD ΔE ≥ 9,2 en todos los pares, claro y oscuro); el color con contraste < 3:1 en tema claro se compensa con leyenda y vista de tabla.

## 4. Pruebas
| Archivo | Qué verifica |
|---|---|
| `web/src/lib/engine.test.ts` | Mediana/percentiles equivalentes a `percentile_cont`, Wilson, filtros (O entre géneros, Y entre tags), exclusión de F2P y atípicos en precio |
| `web/src/lib/engine.real.test.ts` | Criterios de aceptación de la Fase 2 con los 55 918 juegos; paridad del panel de concepto con `rpc_concept_benchmark`; filtrado < 50 ms |

## 5. Desviaciones respecto al plan, justificadas
| Plan | Implementado | Motivo |
|---|---|---|
| KPIs servidos por vistas materializadas/RPC | KPIs de los gráficos calculados en el navegador; RPC solo para el panel de concepto | Respuesta instantánea con cualquier combinación de filtros y límite de 3 s del plan gratuito (ver Fase 4) |
| React 18 + ESLint + Prettier | React 19 + oxlint | Versiones estables vigentes que genera la plantilla oficial de Vite |
| shadcn/ui | Componentes propios accesibles sobre Tailwind 4 | Menos dependencias; mismos patrones (combobox con búsqueda, control segmentado, diálogo) |
| Scripts numerados `01_extract.py…` | Módulos con nombre + `etl/run.py` | Los nombres que empiezan con número no se pueden importar en Python |
| Umbral de precio atípico $200 | $80 | Hallazgo de la Fase 2 (banda ≥ $60 contaminada) |
| K14 (indie vs. no indie) con gráfica | Disponible en la tabla de la gráfica de DLC | Prioridad *Could* en la Fase 2 |

## 6. Incidentes resueltos durante la carga
1. **Tiempo límite de sentencia de Supabase** cortaba el COPY de 125 k filas → `set statement_timeout = 0` solo en la sesión de carga.
2. **Borrado con `NOT IN`** degeneraba en comparación cuadrática (> 10 min) → `NOT EXISTS` con clave primaria en staging (segundos).
