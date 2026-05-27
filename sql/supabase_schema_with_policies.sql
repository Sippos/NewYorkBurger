-- Supabase schema + permissive policies for quick testing
-- Run this in Supabase SQL editor. Rotate keys after testing.

-- Movie tables
create table if not exists nominations (
  id bigserial primary key,
  lobby_id text not null,
  movie_id bigint,
  title text,
  poster text,
  nominated_by text,
  created_at timestamptz default now(),
  unique(lobby_id, movie_id)
);

create table if not exists votes (
  id bigserial primary key,
  lobby_id text not null default 'global',
  movie_id bigint not null,
  title text,
  poster text,
  voter text not null,
  vote text not null check (vote in ('like', 'dislike')),
  created_at timestamptz default now(),
  unique(lobby_id, movie_id, voter)
);

create table if not exists ratings (
  id bigserial primary key,
  movie_id bigint,
  rater text,
  rating numeric,
  created_at timestamptz default now(),
  unique(movie_id, rater)
);

create table if not exists watched (
  id bigserial primary key,
  movie_id bigint unique,
  title text,
  poster text,
  watched_by text,
  watched_at timestamptz default now()
);

-- Series tables
create table if not exists series_nominations (
  id bigserial primary key,
  lobby_id text not null,
  series_id bigint,
  title text,
  poster text,
  nominated_by text,
  created_at timestamptz default now(),
  unique(lobby_id, series_id)
);

create table if not exists series_votes (
  id bigserial primary key,
  lobby_id text not null default 'global',
  series_id bigint not null,
  title text,
  poster text,
  voter text not null,
  vote text not null check (vote in ('like', 'dislike')),
  created_at timestamptz default now(),
  unique(lobby_id, series_id, voter)
);

create table if not exists series_ratings (
  id bigserial primary key,
  series_id bigint,
  rater text,
  rating numeric,
  created_at timestamptz default now(),
  unique(series_id, rater)
);

create table if not exists series_watched (
  id bigserial primary key,
  series_id bigint unique,
  title text,
  poster text,
  watched_by text,
  watched_at timestamptz default now()
);

-- Game tables
create table if not exists game_nominations (
  id bigserial primary key,
  lobby_id text not null,
  game_id bigint,
  title text,
  poster text,
  nominated_by text,
  created_at timestamptz default now(),
  unique(lobby_id, game_id)
);

create table if not exists game_votes (
  id bigserial primary key,
  lobby_id text not null default 'global',
  game_id bigint not null,
  title text,
  poster text,
  voter text not null,
  vote text not null check (vote in ('like', 'dislike')),
  created_at timestamptz default now(),
  unique(lobby_id, game_id, voter)
);

create table if not exists game_ratings (
  id bigserial primary key,
  game_id bigint,
  rater text,
  rating numeric,
  created_at timestamptz default now(),
  unique(game_id, rater)
);

create table if not exists game_watched (
  id bigserial primary key,
  game_id bigint unique,
  title text,
  poster text,
  watched_by text,
  watched_at timestamptz default now()
);

-- Shared video links
create table if not exists video_links (
  id text primary key,
  title text,
  url text,
  poster text,
  platform text,
  uploaded_by text,
  is_classic boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS and add permissive policies for anonymous testing.
-- These policies are permissive for quick testing. For production, require authenticated users and stricter checks.
alter table nominations enable row level security;
alter table votes enable row level security;
alter table ratings enable row level security;
alter table watched enable row level security;
alter table series_nominations enable row level security;
alter table series_votes enable row level security;
alter table series_ratings enable row level security;
alter table series_watched enable row level security;
alter table game_nominations enable row level security;
alter table game_votes enable row level security;
alter table game_ratings enable row level security;
alter table game_watched enable row level security;
alter table video_links enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'nominations', 'votes', 'ratings', 'watched',
    'series_nominations', 'series_votes', 'series_ratings', 'series_watched',
    'game_nominations', 'game_votes', 'game_ratings', 'game_watched',
    'video_links'
  ] loop
    execute format('drop policy if exists public_select_%s on %I', table_name, table_name);
    execute format('drop policy if exists public_insert_%s on %I', table_name, table_name);
    execute format('drop policy if exists public_update_%s on %I', table_name, table_name);
    execute format('drop policy if exists public_delete_%s on %I', table_name, table_name);
    execute format('create policy public_select_%s on %I for select using (true)', table_name, table_name);
    execute format('create policy public_insert_%s on %I for insert with check (true)', table_name, table_name);
    execute format('create policy public_update_%s on %I for update using (true) with check (true)', table_name, table_name);
    execute format('create policy public_delete_%s on %I for delete using (true)', table_name, table_name);
  end loop;
end $$;
