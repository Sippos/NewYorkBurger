-- Supabase schema + permissive policies for quick testing
-- Run this in Supabase SQL editor. Rotate keys after testing.

-- Tables
create table if not exists nominations (
  id bigserial primary key,
  lobby_id text not null,
  movie_id bigint,
  title text,
  poster text,
  nominated_by text,
  created_at timestamptz default now()
);

create table if not exists votes (
  id bigserial primary key,
  lobby_id text,
  movie_id bigint,
  voter text,
  vote text,
  created_at timestamptz default now()
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
  movie_id bigint,
  title text,
  poster text,
  watched_by text,
  watched_at timestamptz default now()
);

-- Enable RLS and add permissive policies for anonymous testing
alter table nominations enable row level security;
create policy public_select_nominations on nominations
  for select using (true);
create policy public_insert_nominations on nominations
  for insert with check (true);

alter table votes enable row level security;
create policy public_select_votes on votes
  for select using (true);
create policy public_insert_votes on votes
  for insert with check (true);

alter table ratings enable row level security;
create policy public_select_ratings on ratings
  for select using (true);
create policy public_insert_ratings on ratings
  for insert with check (true);

alter table watched enable row level security;
create policy public_select_watched on watched
  for select using (true);
create policy public_insert_watched on watched
  for insert with check (true);

ALTER TABLE votes
ADD CONSTRAINT votes_unique_user_movie
UNIQUE(movie_id, voter);

drop table if exists votes;

create table votes (
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
-- NOTE: These policies are permissive for quick testing. For production, require
-- authenticated users and stricter checks (auth.uid(), membership, etc.).
