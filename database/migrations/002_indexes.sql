-- 002 · Índices: GIN para atributos multivaluados, B-tree para filtros frecuentes
create index if not exists games_genres_gin  on public.games using gin (genres);
create index if not exists games_tags_gin    on public.games using gin (tags);
create index if not exists games_langs_gin   on public.games using gin (languages);
create index if not exists games_universe_idx on public.games (in_universe, business_model, price_band, release_year);
create index if not exists games_primary_genre_idx on public.games (primary_genre) where in_universe;
