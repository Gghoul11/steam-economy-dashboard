-- 001 · Tabla de hechos del catálogo de Steam (una fila por título)
create table if not exists public.games (
    app_id               integer primary key,
    name                 text        not null,
    release_date         date,
    release_year         smallint,
    release_month        smallint,
    is_mature            boolean     not null default false,  -- ≥ 12 meses desde el lanzamiento
    pre_steam_release    boolean     not null default false,

    price                numeric(8,2) not null,  -- precio observado (con descuento)
    discount             smallint     not null default 0,
    list_price           numeric(8,2) not null,  -- precio de lista reconstruido
    price_band           text,
    business_model       text         not null check (business_model in ('Pago','F2P','Gratis')),
    is_price_outlier     boolean      not null default false,
    dlc_count            integer      not null default 0,
    has_dlc              boolean      not null default false,

    positive             integer      not null default 0,
    negative             integer      not null default 0,
    total_reviews        integer      not null default 0,
    positive_ratio       real,
    wilson_score         real,
    metacritic_score     smallint,
    recommendations      integer,

    median_playtime_h    real,
    average_playtime_h   real,
    is_playtime_outlier  boolean      not null default false,
    peak_ccu             integer,
    owners_min           integer,
    owners_max           integer,
    owners_mid           integer,

    required_age         smallint,
    achievements         integer,
    windows              boolean,
    mac                  boolean,
    linux                boolean,
    header_image         text,

    developers           text[]       not null default '{}',
    publishers           text[]       not null default '{}',
    is_self_published    boolean      not null default false,
    is_indie             boolean      not null default false,
    primary_genre        text,
    genres               text[]       not null default '{}',
    categories           text[]       not null default '{}',
    tags                 text[]       not null default '{}',
    languages            text[]       not null default '{}',
    n_languages          smallint     not null default 0,

    in_universe          boolean      not null default false,
    exclusion_reason     text
);

comment on table  public.games is 'Steam Games Dataset (FronkonGames) limpio por el ETL del proyecto.';
comment on column public.games.list_price is 'price / (1 - discount/100), ajustado a .99';
comment on column public.games.wilson_score is 'Límite inferior de Wilson al 95 % de reseñas positivas (0–100)';
