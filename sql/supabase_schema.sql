-- Supabase schema for NewYorkBurger

-- Nominations: friends nominate movies into a lobby
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

-- Votes: one row per movie vote (like/dislike)
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

-- Ratings: per-user rating for watched movies
create table if not exists ratings (
  id bigserial primary key,
  movie_id bigint,
  rater text,
  rating numeric,
  created_at timestamptz default now(),
  unique(movie_id, rater)
);

-- Watched: record when a movie was watched
create table if not exists watched (
  id bigserial primary key,
  movie_id bigint unique,
  title text,
  poster text,
  watched_by text,
  watched_at timestamptz default now()
);

-- Series nominations
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

-- Series votes
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

-- Series ratings
create table if not exists series_ratings (
  id bigserial primary key,
  series_id bigint,
  rater text,
  rating numeric,
  created_at timestamptz default now(),
  unique(series_id, rater)
);

-- Watched series
create table if not exists series_watched (
  id bigserial primary key,
  series_id bigint unique,
  title text,
  poster text,
  watched_by text,
  watched_at timestamptz default now()
);

-- Game nominations
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

-- Game votes
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

-- Game ratings
create table if not exists game_ratings (
  id bigserial primary key,
  game_id bigint,
  rater text,
  rating numeric,
  created_at timestamptz default now(),
  unique(game_id, rater)
);

-- Played games
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
