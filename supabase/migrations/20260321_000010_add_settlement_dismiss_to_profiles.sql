alter table public.profiles
  add column if not exists last_seen_settlement_season_id uuid references public.seasons (id) on delete set null;
