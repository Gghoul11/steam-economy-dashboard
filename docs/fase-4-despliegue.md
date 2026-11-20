# Fase 4 — Despliegue y Documentación Final
## Ecosistema Steam: Economía del Gaming, Precios y Retención
**Autor:** Aldo Arceo Beltrán · **Fecha:** 2026-11-20 · **Demo:** https://aldo-steam-dashboard.vercel.app/

---

## 1. Infraestructura de producción (costo: USD 0)
| Servicio | Plan | Uso |
|---|---|---|
| GitHub | Gratuito | Repositorio público `Gghoul11/steam-economy-dashboard`, CI y keep-alive |
| Vercel | Hobby | Hosting estático + CDN; despliegue automático en cada push a `main` |
| Supabase | Free | PostgreSQL 17 (us-west-2): 125 855 filas, 120 MB de 500 MB |

## 2. Decisión: arquitectura híbrida
**Problema medido.** El rol público (`anon`) de Supabase tiene `statement_timeout = 3s`. Paginar la vista del dashboard con `OFFSET` obliga a PostgreSQL a recorrer y proyectar todas las filas anteriores: la página que empieza en 30 000 tardó 2,2 s en el servidor; con 56 páginas en paralelo varias superaron 3 s (HTTP 500, código 57014). Una descarga completa optimizada seguiría en 4–6 s.

**Decisión (aprobada por el autor).**
- Los gráficos se calculan sobre el snapshot del ETL servido por el CDN (2,2 MB comprimido con Brotli).
- Supabase responde en vivo `rpc_concept_benchmark` (0,2–1,2 s medidos con la clave pública) y `rpc_health` (estado en el pie de página).
- Si Supabase no responde, el panel usa el cálculo local; una prueba automática garantiza que ambos devuelven los mismos valores.

## 3. Seguridad
| Control | Verificación |
|---|---|
| RLS + `grant select` únicamente | Con la clave pública: lectura 200; `INSERT`, `DELETE` y `refresh_kpi_views` → **401** |
| Secretos fuera del repositorio | `.env` y `web/.env.local` en `.gitignore`; verificado antes del primer commit |
| Clave pública en el navegador | Clave *publishable* (diseñada para ser pública); la contraseña de la base y la clave secreta nunca salen del equipo local |
| Cabeceras HTTP | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, HSTS |
| Rotación | La contraseña de la base se rotó durante la configuración tras quedar parcialmente expuesta en un mensaje de error |

## 4. Verificación en producción (2026-11-20)
| Prueba | Resultado |
|---|---|
| Página principal | 200 en 0,8 s; título correcto |
| Recursos estáticos | Caché de 1 año (`immutable`) |
| `games.json` | 200, Brotli, 2,2 MB transferidos, caché de 1 h |
| Variables de entorno | URL de Supabase presente en el build |
| Enlace con filtros (`?vista=precio&genero=RPG&…`) | 200 y estado reproducido |
| CI en `main` | ✅ success |
| Keep-alive (ejecución manual) | ✅ success contra `rpc_health` |
| Indicador en la app | "conectado (125.855 registros)" — confirmado por el autor |

## 5. Procedimiento reproducible
```powershell
# Base de datos (requiere DATABASE_URL en .env, pooler de sesión, puerto 5432)
etl\.venv\Scripts\python -m etl.run --load

# Front local (requiere web/.env.local con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY)
cd web; npm install; npm run dev
```
Vercel: proyecto importado desde GitHub con **Root Directory = `web`**, preset Vite y las dos variables `VITE_*`.
GitHub Actions: variable `SUPABASE_URL` y secreto `SUPABASE_ANON_KEY` para el keep-alive (lunes y jueves).

## 6. Mantenimiento
| Tarea | Cómo |
|---|---|
| Actualizar el dataset | Reemplazar `data/raw/games.csv` → `python -m etl.run --load` → commit de `web/public/data/` → push (Vercel redepliega) |
| Evitar la pausa de Supabase | Automático (keep-alive); si se pausa, el dashboard sigue funcionando y basta reanudar el proyecto en Supabase |
| Revisar calidad | `data/processed/quality_report.md` tras cada ejecución |

## 7. Fuera de alcance (posibles mejoras)
Dominio propio, analítica de visitas, actualización automática desde Kaggle, paginación por rangos de `app_id` para servir todo desde PostgreSQL en un plan de pago.
