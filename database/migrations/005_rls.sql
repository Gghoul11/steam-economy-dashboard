-- 005 · Seguridad: el rol público (anon) solo puede leer; nadie escribe desde el front.
alter table public.games enable row level security;

drop policy if exists games_public_read on public.games;
create policy games_public_read on public.games
    for select to anon, authenticated using (true);

revoke insert, update, delete, truncate on public.games from anon, authenticated;
grant select on public.games, public.v_games_dashboard to anon, authenticated;
grant select on public.mv_segment_kpis, public.mv_price_distribution,
                public.mv_tag_stats, public.mv_tag_launches_by_year to anon, authenticated;
grant execute on function public.rpc_concept_benchmark(text, text[], numeric) to anon, authenticated;
grant execute on function public.rpc_health() to anon, authenticated;
revoke execute on function public.refresh_kpi_views() from anon, authenticated, public;
