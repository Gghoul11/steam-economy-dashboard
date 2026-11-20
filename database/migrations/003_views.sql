-- 003 · Vistas para el front y vistas materializadas de KPIs (Fase 2 §5)

-- Columnas mínimas que consume el dashboard (equivalente a web/public/data/games.json)
create or replace view public.v_games_dashboard as
select app_id, name, release_year, release_month, list_price, business_model, price_band,
       round(wilson_score::numeric, 1) as wilson_score, total_reviews,
       round(median_playtime_h::numeric, 1) as median_playtime_h, peak_ccu,
       is_indie, has_dlc, is_mature, is_price_outlier, is_playtime_outlier,
       genres, tags, primary_genre
from public.games
where in_universe;

-- K1–K6, K10–K14: agregado por género × modelo × banda × año × indie
drop materialized view if exists public.mv_segment_kpis;
create materialized view public.mv_segment_kpis as
select g.genre, s.business_model, s.price_band, s.release_year, s.is_indie,
       count(*)                                                        as n_games,
       percentile_cont(0.5) within group (order by s.list_price)
           filter (where s.business_model = 'Pago' and not s.is_price_outlier) as median_list_price,
       percentile_cont(0.5) within group (order by s.wilson_score)     as median_wilson,
       percentile_cont(0.5) within group (order by s.median_playtime_h) as median_playtime_h,
       count(s.median_playtime_h)                                      as n_playtime,
       percentile_cont(0.5) within group (order by s.peak_ccu)         as median_peak_ccu
from public.games s
cross join lateral unnest(s.genres) as g(genre)
where s.in_universe
group by g.genre, s.business_model, s.price_band, s.release_year, s.is_indie;

-- K7: distribución de precio de lista por género principal
drop materialized view if exists public.mv_price_distribution;
create materialized view public.mv_price_distribution as
select primary_genre,
       count(*) as n_games,
       percentile_cont(array[0.1, 0.25, 0.5, 0.75, 0.9]) within group (order by list_price) as p10_p25_p50_p75_p90
from public.games
where in_universe and business_model = 'Pago' and not is_price_outlier
group by primary_genre;

-- K8–K9: estadísticas por tag (universo) y oferta por tag × año (todos los juegos)
drop materialized view if exists public.mv_tag_stats;
create materialized view public.mv_tag_stats as
select t.tag,
       count(*)                                                   as n_games,
       percentile_cont(0.5) within group (order by g.wilson_score) as median_wilson,
       percentile_cont(0.5) within group (order by g.list_price)
           filter (where g.business_model = 'Pago' and not g.is_price_outlier) as median_list_price,
       percentile_cont(0.5) within group (order by g.median_playtime_h) as median_playtime_h
from public.games g
cross join lateral unnest(g.tags) as t(tag)
where g.in_universe
group by t.tag
having count(*) >= 30;

drop materialized view if exists public.mv_tag_launches_by_year;
create materialized view public.mv_tag_launches_by_year as
select t.tag, g.release_year, count(*) as launches
from public.games g
cross join lateral unnest(g.tags) as t(tag)
where coalesce(g.exclusion_reason, 'pocas_resenas') = 'pocas_resenas'
  and g.release_year between 2006 and 2025
group by t.tag, g.release_year;

-- K15: base ligera de juegos comparables (solo las 6 columnas que usa el RPC).
-- Leer la tabla completa (47 columnas) superaba el límite de 3 s del rol anon en géneros grandes.
drop materialized view if exists public.mv_concept_base;
create materialized view public.mv_concept_base as
select app_id, list_price::float8 as price, wilson_score, median_playtime_h, price_band, genres, tags
from public.games
where in_universe and business_model = 'Pago' and not is_price_outlier;

-- Conteos para el indicador de estado (evita count(*) sobre la tabla completa)
drop materialized view if exists public.mv_dataset_stats;
create materialized view public.mv_dataset_stats as
select count(*) as games, count(*) filter (where in_universe) as universe from public.games;

create index if not exists mv_segment_kpis_idx on public.mv_segment_kpis (genre, business_model, price_band);
create unique index if not exists mv_tag_stats_idx on public.mv_tag_stats (tag);
create unique index if not exists mv_concept_base_pk on public.mv_concept_base (app_id);
create index if not exists mv_concept_base_genres on public.mv_concept_base using gin (genres);
create index if not exists mv_concept_base_tags on public.mv_concept_base using gin (tags);
