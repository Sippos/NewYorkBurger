create table if not exists video_links (
  id text primary key,
  title text not null,
  url text not null,
  poster text,
  platform text not null default 'link',
  uploaded_by text not null,
  is_classic boolean not null default false,
  created_at timestamptz not null default now()
);

alter table video_links enable row level security;

create policy if not exists "Video links are readable by everyone"
  on video_links for select
  using (true);

create policy if not exists "Anyone can add video links"
  on video_links for insert
  with check (true);

create policy if not exists "Anyone can update video links"
  on video_links for update
  using (true)
  with check (true);

create policy if not exists "Anyone can delete video links"
  on video_links for delete
  using (true);
