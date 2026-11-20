# Fase 2 — Diseño de Wireframes y KPIs
## Ecosistema Steam: Economía del Gaming, Precios y Retención
**Autor:** Aldo Arceo Beltrán (desarrollo individual) · **Fecha:** 2026-11-20 · **Estado:** propuesta para aprobación
**Base:** decisiones aprobadas en la Fase 1 (incluida la sección 1.4, ajustes del perfilado).

---

## 0. Universo analítico y valores de referencia

Todos los KPIs se calculan sobre el **universo analítico** aprobado en la Fase 1:

| Filtro aplicado sobre 125 855 títulos | Excluidos |
|---|---|
| Ruido (playtest, demo, soundtrack en el nombre) | 8 209 |
| Software o sin género de juego | 1 497 |
| Menos de 10 reseñas | 60 231 |
| **Universo resultante** | **55 918 juegos** |

Los valores de referencia de este documento salen de un cálculo de solo lectura sobre `games.csv`. El ETL de la Fase 3 los recalculará y los validará.

### 0.1 Hallazgos del cálculo que condicionan el diseño
1. **Sesgo de madurez.** En 2025 se lanzaron 24 973 títulos, pero solo 3 141 alcanzan 10 reseñas; ningún título de 2026 las alcanza (no han tenido tiempo de acumularlas). Además, la mediana de reseñas positivas sube de 75 % (2018) a 89,8 % (2025), porque solo sobreviven los juegos recientes que funcionan bien. **Decisión:** las tendencias anuales usan solo cohortes con al menos 12 meses desde su lanzamiento, y la gráfica muestra ese corte de forma explícita.
2. **La banda "≥ $60" está contaminada.** Tiene una mediana de $199,99 con apenas 193 títulos (paquetes, ediciones especiales, software mal clasificado). **Decisión:** el umbral de precio atípico baja de $200 a **$80** (el precio de lista de un AAA está entre $69,99 y $79,99), y la banda superior se renombra "$40–79.99".
3. **La estacionalidad es débil.** El Wilson mediano por mes de lanzamiento solo varía entre 68,2 y 71,7 puntos. **Decisión:** la estacionalidad no merece una vista propia; se muestra como un heatmap secundario que analiza la saturación (cuántos lanzamientos compiten) más que el éxito.
4. **Correlación, no causalidad.** Los juegos con DLC tienen un Wilson mediano de 78,0, frente a 66,5 sin DLC; lo más probable es que solo los juegos exitosos lleguen a publicar DLC. **Decisión:** el dashboard incluye una nota metodológica fija que advierte que las relaciones son asociaciones.

---

## 1. Catálogo de KPIs

Convenciones:
- **Wilson** = límite inferior del intervalo de confianza de Wilson al 95 % sobre reseñas positivas/totales (rango 0–100).
- Los precios se expresan siempre en **precio de lista** (`list_price`) y solo para el segmento de pago.
- Todo KPI se muestra con su tamaño de muestra (`n`).

### 1.1 KPIs de cabecera (fila de indicadores, responden a los filtros globales)
| # | KPI | Pregunta que responde | Fórmula | Universo | Referencia global |
|---|---|---|---|---|---|
| K1 | **Juegos en el segmento** | ¿Cuánta competencia hay en mi nicho? | `count(*)` | Filtro activo | 55 918 |
| K2 | **Precio de lista mediano** | ¿A qué precio vende mi competencia? | `percentile_cont(0.5)` de `list_price` | Pago, sin atípicos | $5,99 |
| K3 | **Recepción mediana (Wilson)** | ¿Qué tan exigente es la audiencia del segmento? | mediana de `wilson_score` | Todos | 68,9 |
| K4 | **Horas de juego medianas** | ¿Cuánto engancha un juego típico? | mediana de `median_playtime_h` (excluye nulos) | Con dato de horas | 3,5 h (n = 23 559) |
| K5 | **Proporción F2P** | ¿Qué modelo de cobro domina el segmento? | `count(F2P) / count(*)` | Todos | 8,8 % |

Cada tarjeta muestra el valor del segmento filtrado y su diferencia frente al universo completo (p. ej. "+1,2 pts vs. Steam"). No se usan colores de alerta, porque no existe una meta que cumplir.

### 1.2 KPIs analíticos (alimentan las gráficas de cada vista)
| # | KPI | Fórmula / definición | Granularidad | Referencia |
|---|---|---|---|---|
| K6 | **Recepción por banda de precio** | Wilson mediano y n por banda | 5 bandas de precio | <$5: 65,4 · $5–9.99: 70,2 · $10–19.99: 74,5 · $20–39.99: 76,9 · $40–79.99: ≈76,7 |
| K7 | **Distribución de precio por género** | P10, P25, P50, P75, P90 de `list_price` | Género (top 10) | RPG $8,99 · Casual $4,98 · Strategy $7,98 |
| K8 | **Índice de oportunidad de nicho** | `wilson_mediano_tag × (1 − percentil_de_saturación_tag)`: alta recepción con poca competencia | Tag (≥ 30 títulos) | Se calcula en el ETL |
| K9 | **Saturación de tags** | Títulos por tag y lanzamientos en los últimos 24 meses (crecimiento de la oferta) | Tag × año | Se calcula en el ETL |
| K10 | **Retención por modelo de cobro** | Horas medianas y P25–P75 | Pago / F2P / gratuito no-F2P | 3,6 h / 1,4 h / 2,2 h |
| K11 | **Retención por banda de precio** | Horas medianas y Peak CCU mediano | Banda de precio | 2,9 h → 12,8 h; CCU 2 → 68 |
| K12 | **Tendencia de lanzamientos y precio** | Lanzamientos por año (en el universo y en el total) y precio de lista mediano | Año (cohortes de 12 meses o más) | Precio de 4,99 (2016) a 6,99 (2024) |
| K13 | **Prima de DLC** | Diferencia de Wilson y de horas entre juegos con y sin DLC | Género | +11,5 pts Wilson (asociación) |
| K14 | **Diferencia indie vs. no-indie** | Precio mediano y Wilson por bandera indie | Global / género | $4,99 vs. $9,96 |
| K15 | **Posición percentil de un concepto** | Percentil que ocuparía un precio dado dentro de su segmento (género + tags) | Entrada del usuario | Función RPC |

K15 es la función que convierte el dashboard en una **herramienta de decisión**: el usuario describe su juego (género, tags y precio previsto) y obtiene en qué percentil de precio quedaría y cómo se comportan los juegos parecidos.

---

## 2. Arquitectura de información

```
┌ Barra de filtros global (fija, aplica a todas las vistas, se refleja en la URL) ┐
└────────────────────────────────────────────────────────────────────────────────┘
  ├── Vista 1 · Panorama          → K1–K5, K12, mapa general del mercado
  ├── Vista 2 · Precio y modelo   → K6, K7, K13, K14, K2
  ├── Vista 3 · Nichos            → K8, K9, tabla explorable de tags
  ├── Vista 4 · Retención         → K10, K11, horas vs. recepción
  └── Panel  · Evalúa tu concepto → K15 (cajón lateral, accesible desde cualquier vista)
```

**Filtros globales** (una sola fila, encima de todas las gráficas):
| Filtro | Control | Valor por defecto |
|---|---|---|
| Género | Selección múltiple | Todos |
| Tags | Selección múltiple con búsqueda (lógica Y) | Ninguno |
| Modelo de cobro | Control segmentado: Todos / Pago / F2P / Gratis | Todos |
| Banda de precio | Selección múltiple | Todas |
| Años de lanzamiento | Rango deslizante | 2014–2025 |
| Indie | Control de tres estados: Todos / Indie / No indie | Todos |
| Mínimo de reseñas | Selector: 10 / 100 / 1 000 | 10 |

Reglas de interacción:
- **Filtrado cruzado:** al hacer clic en una barra (un género, una banda o un tag) se añade ese valor al filtro global, y la barra de filtros lo muestra como una etiqueta removible.
- **URL compartible:** cada combinación de filtros genera un enlace (p. ej. `?genre=RPG&price=10-19.99`).
- Al recargar datos se conserva el gráfico anterior atenuado, sin parpadeos ni esqueletos de carga.
- Cada gráfica tiene un botón **"Ver tabla"** con los mismos datos (accesibilidad y exportación).
- Cada gráfica muestra su `n` en el subtítulo; con `n < 30` aparece un aviso de "muestra insuficiente".

---

## 3. Wireframes (escritorio, 1440 px)

### 3.1 Vista 1 — Panorama
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ◆ Steam Economy        Panorama | Precio y modelo | Nichos | Retención  [Evalúa ▸]│
├──────────────────────────────────────────────────────────────────────────────────┤
│ [Género ▾] [Tags ▾] [Pago|F2P|Gratis] [Banda ▾] [2014 ━━●━━━●━ 2025] [Indie ▾]   │
│ Filtros activos: (RPG ✕) (Roguelike ✕)                             Limpiar todo  │
├──────────────┬──────────────┬──────────────┬──────────────┬──────────────────────┤
│ JUEGOS       │ PRECIO MED.  │ RECEPCIÓN    │ HORAS MED.   │ PROPORCIÓN F2P       │
│ 55 918       │ $5,99        │ 68,9         │ 3,5 h        │ 8,8 %                │
│ 100 % Steam  │ = Steam      │ Wilson · n   │ n = 23 559   │ vs. 8,8 % Steam      │
├──────────────┴──────────────┴──────────────┴──────────────┴──────────────────────┤
│ Lanzamientos por año (solo cohortes de 12 meses o más)                           │
│ ▁▂▃▅▆▇▇██  ← barras: universo · línea gris: total de lanzamientos   [Ver tabla]  │
├─────────────────────────────────────────┬────────────────────────────────────────┤
│ Precio de lista mediano por año         │ Recepción mediana por año              │
│ (línea, eje propio)                     │ (línea, eje propio)                    │
│ — dos gráficas separadas, nunca eje doble —                                      │
├─────────────────────────────────────────┴────────────────────────────────────────┤
│ ⓘ Nota metodológica: medianas · Wilson 95 % · ≥ 10 reseñas · asociación ≠ causa  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Vista 2 — Precio y modelo de cobro
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ (barra de filtros global)                                                        │
├─────────────────────────────────────────┬────────────────────────────────────────┤
│ K6 · Recepción por banda de precio      │ K7 · Distribución de precio por género │
│ Columnas: Wilson mediano por banda,     │ Diagrama de caja horizontal (P10–P90), │
│ etiqueta de n bajo cada banda           │ top 10 géneros; el género filtrado se  │
│ ▃ ▅ ▆ ▇ ▇                               │ resalta y el resto queda en gris       │
│ <5 5-10 10-20 20-40 40-80               │ RPG      ├──[■■|■■■]────┤              │
│                                         │ Casual   ├─[■|■■]──┤                   │
├─────────────────────────────────────────┼────────────────────────────────────────┤
│ Dispersión: precio de lista (log) vs.   │ K13/K14 · Comparativas                 │
│ Wilson, un punto por juego (≈ 49 k,     │ Pares de puntos (dumbbell):            │
│ canvas), color por modelo de cobro,     │ con/sin DLC e indie/no-indie, por      │
│ zoom con rueda, tooltip con nombre      │ género                                 │
│ ·  ·: ·:·:·::·:·  ·                     │ RPG    ●────────●                      │
│                                         │ Action ●──────●                        │
└─────────────────────────────────────────┴────────────────────────────────────────┘
```

### 3.3 Vista 3 — Nichos
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ (barra de filtros global)                                                        │
├──────────────────────────────────────────────────────────────────────────────────┤
│ K8 · Mapa de oportunidad: saturación (n.º títulos, eje X log) vs. Wilson (eje Y) │
│ Un punto por tag (≥ 30 títulos); cuadrante superior izquierdo = "alta recepción, │
│ poca competencia", etiquetado; líneas de referencia en las medianas               │
│        ·Cozy   ·Roguelite                     │                                  │
│   ·Metroidvania                ·             │      ·Indie   ·Casual            │
│ ──────────────────────────────┼──────────────────────────── mediana Wilson       │
├─────────────────────────────────────────┬────────────────────────────────────────┤
│ K9 · Heatmap tag × año                  │ Tabla explorable de tags               │
│ Celdas: lanzamientos (secuencial, un    │ Tag | n | Wilson | Precio med. |       │
│ solo tono); top 20 tags × 2014–2025     │ Horas med. | Oportunidad (ordenable)   │
│ Clic en una celda → filtra tag + año    │ Clic en una fila → filtro global       │
└─────────────────────────────────────────┴────────────────────────────────────────┘
```

### 3.4 Vista 4 — Retención
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ (barra de filtros global)        ⓘ Retención: solo juegos con dato de SteamSpy   │
├─────────────────────────────────────────┬────────────────────────────────────────┤
│ K10 · Horas por modelo de cobro         │ K11 · Horas medianas por banda de      │
│ Diagrama de caja (P25–P75, mediana)     │ precio (columnas, n debajo)            │
│ en escala log: Pago / F2P / Gratis      │ ▂ ▂ ▃ ▅ █                              │
├─────────────────────────────────────────┼────────────────────────────────────────┤
│ Horas (log) vs. Wilson                  │ Líderes de Peak CCU (top 1 %)          │
│ Dispersión por juego; cuadrante "alta   │ Barras horizontales ordenadas; se      │
│ retención y alta recepción"; color por  │ muestran aparte para no distorsionar   │
│ modelo de cobro                         │ los agregados                          │
└─────────────────────────────────────────┴────────────────────────────────────────┘
```

### 3.5 Panel lateral — Evalúa tu concepto (K15)
```
                                       ┌───────────────────────────────────────────┐
                                       │ Evalúa tu concepto                    ✕   │
                                       │ Género   [Roguelike Deckbuilder ▾]        │
                                       │ Tags     [Cozy ✕] [Pixel Graphics ✕]      │
                                       │ Precio   [$14.99      ]                   │
                                       │ ───────────────────────────────────────── │
                                       │ Juegos comparables: 412                   │
                                       │ Tu precio está en el percentil 71         │
                                       │ ├────────[■■■|■■■■]───●───┤ (caja + tú)   │
                                       │ Wilson mediano de los comparables: 74,1   │
                                       │ Horas medianas: 6,2 h                     │
                                       │ Banda con mejor recepción: $10–19.99      │
                                       │ [Aplicar como filtro global]              │
                                       └───────────────────────────────────────────┘
```

### 3.6 Adaptación a móvil (≈ 400 px)
- La barra de filtros se pliega en un botón "Filtros (n)" que abre una hoja inferior.
- La fila de KPIs pasa a 2 columnas que se desplazan; cada gráfica ocupa el ancho completo y se apila.
- Las dispersiones se reemplazan por su tabla en pantallas menores de 640 px, porque 49 000 puntos en un móvil no se pueden leer.
- El panel "Evalúa tu concepto" ocupa la pantalla completa.

---

## 4. Lineamientos visuales

| Aspecto | Decisión | Motivo |
|---|---|---|
| Color categórico | **Solo 3 colores fijos**, uno por modelo de cobro (Pago, F2P, Gratis no-F2P), iguales en todas las vistas | El color identifica siempre la misma entidad; al filtrar no cambia |
| Magnitud | Escala secuencial de un solo tono (heatmap) | Más oscuro = más; no se usa arcoíris |
| Énfasis | Elemento seleccionado en color de acento y el resto en gris | El usuario ve su segmento contra el mercado |
| Ejes | Nunca dos ejes Y; escala log en precio, horas y CCU, indicada en el título | Distribuciones muy sesgadas |
| Paleta | Se validará con el script de daltonismo (contraste y separación) en modo claro y oscuro durante la Fase 3 | Accesibilidad verificable, no a ojo |
| Etiquetas | Rotulado selectivo (extremos, selección); tooltip con nombre, valor y n | Evitar ruido visual |
| Tema | Claro y oscuro, cada uno con su propia paleta | Portafolio profesional |
| Tipografía | Una sola familia sans (Inter); cifras tabulares solo en tablas y ejes | Consistencia |

---

## 5. Relación entre KPIs y la capa de datos (lo que se construye en la Fase 3)

| Vista materializada / RPC | KPIs | Filas aprox. |
|---|---|---|
| `games` (tabla con columnas para análisis) | Dispersiones, K15 | ≈ 56 k |
| `mv_segment_kpis` (agregado por género × modelo × banda × año × indie) | K1–K5, K6, K10–K14 | < 20 k |
| `mv_tag_stats` (tag × año) | K8, K9, tabla de tags | ≈ 450 × 12 |
| `mv_price_distribution` (percentiles por género y banda) | K7 | < 500 |
| `rpc_concept_benchmark(genres, tags, price)` | K15 | Calculado al vuelo |
| `rpc_segment_kpis(filters)` | KPIs de cabecera filtrados | Calculado al vuelo |

Las dispersiones cargan solo las columnas necesarias (`appid, name, list_price, wilson, playtime, segment`, ≈ 2 MB comprimido) y se guardan en caché del lado del cliente.

---

## 6. Alcance y prioridades (MoSCoW)
| Prioridad | Elementos |
|---|---|
| **Must** | Filtros globales con URL, Vistas 1 y 2 completas, KPIs K1–K7, K10–K11, tabla para cada gráfica |
| **Should** | Vista 3 (Nichos, K8–K9), panel "Evalúa tu concepto" (K15), modo oscuro |
| **Could** | K13/K14 (dumbbells), líderes de Peak CCU, exportar CSV de la vista |
| **Won't (esta versión)** | Datos en tiempo real, cuentas de usuario, predicción con ML |

---

## 7. Criterios de aceptación para la Fase 3
- Los KPIs del universo completo coinciden con las referencias de este documento (±0,5 %).
- Cada gráfica muestra `n` y tiene una vista de tabla equivalente.
- Ninguna gráfica usa dos ejes; el color de cada modelo de cobro es idéntico en todas las vistas.
- Cambiar un filtro actualiza todas las vistas en < 500 ms, con los datos ya en caché.
- La URL reproduce exactamente el estado de los filtros.
- La paleta pasa el validador de daltonismo en modo claro y oscuro.
