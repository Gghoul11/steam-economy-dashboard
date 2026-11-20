# Fase 4 — Despliegue y Documentación Final
## Ecosistema Steam: Economía del Gaming, Precios y Retención
**Autor:** Aldo Arceo Beltrán · **Fecha:** 2026-11-20 · **Estado:** propuesta para aprobación
**Base:** Fase 3 aprobada tras revisión visual. Decisión: **incluir Supabase** en producción.

---

## 0. Arquitectura de producción
```
GitHub (repo público) ──push──► GitHub Actions: lint + tests + build (CI)
        │                        └─ keep-alive (lun/jue) ──► Supabase
        └──────────► Vercel (raíz: web/) ──HTTPS──► navegador
                                              │
                         1º intento: Supabase REST (v_games_dashboard, RLS solo lectura)
                         respaldo:  /data/games.json (snapshot estático en el mismo deploy)
```
- El navegador solo usa la clave **anon/publishable** (pública por diseño; RLS impide escribir).
- La contraseña de la base y la clave `service_role` **nunca** salen de tu `.env` local.

---

## 1. Pasos y responsables

| # | Paso | Quién | Detalle |
|---|---|---|---|
| 1 | Crear proyecto Supabase | **Tú** | Plan Free, región `us-east-1` (o la más cercana), contraseña fuerte de BD |
| 2 | Pasar credenciales a archivos locales | **Tú** | `.env` (raíz): `DATABASE_URL` — *Connect → Session pooler*, puerto 5432 · `web/.env.local`: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (clave *anon* o *publishable*). No me pegues las claves en el chat: escríbelas en los archivos |
| 3 | Cargar la base | Yo | `python -m etl.run --load`: migraciones 001–005 → COPY de 125 855 filas → upsert → refresco de vistas |
| 4 | Verificar la base | Yo | Conteos (125 855 / 55 918), tamaño < 150 MB, RPC de concepto, vistas materializadas pobladas, **prueba de seguridad**: con la clave anon, `select` funciona e `insert` es rechazado |
| 5 | Probar el front contra Supabase | Yo | `npm run dev` con `.env.local`: el pie debe decir "PostgreSQL (Supabase)"; medir tiempo de carga (meta < 4 s) y comprobar el respaldo con una URL inválida |
| 6 | Ajustes de despliegue | Yo | `web/vercel.json` (caché larga para `/assets/*`, 1 h para `/data/*.json`, cabeceras de seguridad); README con la URL de la demo |
| 7 | Primer commit y repo en GitHub | **Tú** (yo te doy los comandos) | `git config user.name/email`, commit, crear repo `steam-economy-dashboard`, `git push`. Secrets de Actions: variable `SUPABASE_URL` y secreto `SUPABASE_ANON_KEY` |
| 8 | Desplegar en Vercel | **Tú** (guiado) | *Import project* → raíz `web` → preset Vite → variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` → Deploy |
| 9 | Verificación en producción | Yo + tú | Checklist §3 sobre la URL pública |
| 10 | Documentación final | Yo | §2 |

### Riesgos y mitigaciones
| Riesgo | Mitigación |
|---|---|
| Supabase se pausa tras ~7 días sin uso | Workflow keep-alive + respaldo estático automático |
| Carga vía REST lenta (56 páginas de 1 000 filas) | Se mide en el paso 5; si supera 4 s, el front carga primero el snapshot (CDN de Vercel) y usa Supabase para "Evalúa tu concepto" vía RPC y como fuente verificable. Te consultaré antes de cambiarlo |
| Límite de 500 MB del plan Free | Solo columnas analíticas; se mide en el paso 4 |
| Filtración de credenciales | `.env*` en `.gitignore` (ya verificado: no aparecen en el staging), clave anon con RLS |

---

## 2. Documentación final (entregables)
| Archivo | Contenido |
|---|---|
| `docs/fase-3-implementacion.md` | Lo construido, decisiones y desviaciones justificadas (KPIs en cliente, React 19, componentes propios), resultados de pruebas, reporte de calidad |
| `docs/fase-4-despliegue.md` | Arquitectura de producción, pasos reproducibles, verificación, costos (USD 0), mantenimiento |
| `docs/data-dictionary.md` | Las 47 columnas de `public.games`: tipo, origen, regla de limpieza |
| `docs/architecture.md` | Diagrama Mermaid del flujo de datos y de componentes del front |
| `README.md` | URL de la demo, insignia de CI, capturas (tú las tomas; yo dejo los marcadores en `docs/img/`) |

---

## 3. Checklist de verificación en producción
- [ ] La URL pública carga en < 4 s y el pie indica "PostgreSQL (Supabase)".
- [ ] Los KPIs de cabecera coinciden con el reporte de calidad ($5,99 · 68,9 · 8,8 %).
- [ ] Un enlace con filtros (p. ej. `?genero=RPG&precio=$10–19.99`) reproduce el estado al abrirlo en otra ventana.
- [ ] Con Supabase inaccesible, el dashboard sigue funcionando con el snapshot.
- [ ] El CI de GitHub pasa en verde en el commit de `main`.
- [ ] Móvil (≈ 400 px): filtros y gráficas usables sin scroll horizontal.

## 4. Fuera de alcance
Dominio propio, analítica de visitas, actualización automática del dataset desde Kaggle.
