-- 004 · RPC: K15 "Evalúa tu concepto"
-- Juegos comparables = universo, pago, sin atípicos, que contienen el género y TODOS los tags dados.
-- Percentiles con percentile_cont (interpolación lineal), igual que el motor del front.
drop function if exists public.rpc_concept_benchmark(text, text[], numeric);
create or replace function public.rpc_concept_benchmark(
    p_genre text,
    p_tags  text[] default '{}',
    p_price numeric default null
)
returns table (
    n_comparables      bigint,
    price_percentile   double precision,
    p10 double precision, p25 double precision, p50 double precision,
    p75 double precision, p90 double precision,
    median_wilson      double precision,
    median_playtime_h  double precision,
    best_band          text
)
language sql stable
set search_path = public
as $$
    with comp as (
        select price, wilson_score, median_playtime_h, price_band
        from mv_concept_base
        where (p_genre is null or genres @> array[p_genre])
          and (cardinality(p_tags) = 0 or tags @> p_tags)
    ),
    band as (
        select price_band, percentile_cont(0.5) within group (order by wilson_score) as w
        from comp group by price_band having count(*) >= 30
        order by w desc limit 1
    )
    select count(*),
           case when p_price is null or count(*) = 0 then null
                else 100.0 * count(*) filter (where price <= p_price) / count(*) end,
           percentile_cont(0.10) within group (order by price),
           percentile_cont(0.25) within group (order by price),
           percentile_cont(0.50) within group (order by price),
           percentile_cont(0.75) within group (order by price),
           percentile_cont(0.90) within group (order by price),
           percentile_cont(0.5)  within group (order by wilson_score),
           percentile_cont(0.5)  within group (order by median_playtime_h),
           (select price_band from band)
    from comp;
$$;

-- Comprobación ligera de estado para el front y el keep-alive
create or replace function public.rpc_health()
returns table (games bigint, universe bigint)
language sql stable set search_path = public as $$
    select games, universe from mv_dataset_stats;
$$;

-- Refresco de vistas materializadas tras cada carga
create or replace function public.refresh_kpi_views()
returns void language sql security definer set search_path = public as $$
    refresh materialized view mv_segment_kpis;
    refresh materialized view mv_price_distribution;
    refresh materialized view mv_tag_stats;
    refresh materialized view mv_tag_launches_by_year;
    refresh materialized view mv_concept_base;
    refresh materialized view mv_dataset_stats;
    analyze mv_concept_base;
$$;
