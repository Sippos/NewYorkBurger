-- Supabase schema for NewYorkBurger

-- Nominations: friends nominate movies into a lobby
create table if not exists nominations (
  id bigserial primary key,
  lobby_id text not null,
  movie_id bigint,
  title text,
  poster text,
  nominated_by text,
  created_at timestamptz default now()
);

-- Votes: one row per vote (like/dislike)
create table if not exists votes (
  id bigserial primary key,
  lobby_id text,
  movie_id bigint,
  voter text,
  vote text,
  created_at timestamptz default now()
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
  movie_id bigint,
  title text,
  poster text,
  watched_by text,
  watched_at timestamptz default now()
);
