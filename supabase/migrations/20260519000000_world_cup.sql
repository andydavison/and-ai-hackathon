-- World Cup Predictor schema
-- Extends the existing profiles table and adds teams, matches, predictions.

-- Extend existing profiles with points tracking
alter table public.profiles
  add column total_points integer not null default 0;

-- Teams lookup — seeded by scripts/seed-world-cup.ts
create table public.teams (
  id integer primary key,
  name text not null,
  code text not null,
  flag_url text,
  group_letter text not null,
  strength integer not null default 75
);

-- Group-stage match fixtures — seeded by scripts/seed-world-cup.ts
create table public.matches (
  id integer primary key,
  match_number integer not null,
  group_letter text not null,
  home_team_id integer references public.teams(id) not null,
  away_team_id integer references public.teams(id) not null,
  home_score integer default null,
  away_score integer default null,
  status text not null default 'scheduled',
  kickoff_utc timestamptz
);

create index matches_status_idx on public.matches(status);
create index matches_match_number_idx on public.matches(match_number);

-- User predictions (one per user per match)
create table public.predictions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  match_id integer references public.matches(id) on delete cascade not null,
  pred_home_score integer not null,
  pred_away_score integer not null,
  points_awarded integer not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id, match_id)
);

create index predictions_user_id_idx on public.predictions(user_id);
create index predictions_match_id_idx on public.predictions(match_id);

-- RLS
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;

create policy "public read teams"
  on public.teams for select using (true);

create policy "public read matches"
  on public.matches for select using (true);

create policy "public read predictions"
  on public.predictions for select using (true);

create policy "users manage own predictions"
  on public.predictions for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
