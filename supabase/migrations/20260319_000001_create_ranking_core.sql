create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  provider text not null default 'google',
  created_at timestamptz not null default now()
);

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null check (status in ('upcoming', 'active', 'ended')),
  created_at timestamptz not null default now(),
  constraint seasons_valid_range check (ends_at > starts_at)
);

create table if not exists public.season_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  season_id uuid not null references public.seasons (id) on delete cascade,
  category text not null check (category in ('hitter', 'pitcher_starter')),
  current_skills jsonb not null,
  current_score numeric not null,
  score_reached_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, season_id)
);

create table if not exists public.daily_roll_logs (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.season_entries (id) on delete cascade,
  roll_date_kst date not null,
  before_skills jsonb not null,
  rolled_skills jsonb not null,
  selected_result text not null check (selected_result in ('keep', 'replace')),
  final_skills jsonb not null,
  final_score numeric not null,
  created_at timestamptz not null default now(),
  unique (entry_id, roll_date_kst)
);

create index if not exists idx_seasons_status_dates
  on public.seasons (status, starts_at, ends_at);

create index if not exists idx_season_entries_ranking
  on public.season_entries (season_id, category, current_score desc, score_reached_at asc);

create index if not exists idx_daily_roll_logs_entry_date
  on public.daily_roll_logs (entry_id, roll_date_kst);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, provider)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(new.app_metadata ->> 'provider', 'google')
  )
  on conflict (id) do update
  set display_name = excluded.display_name,
      avatar_url = excluded.avatar_url,
      provider = excluded.provider;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user_profile();

create or replace function public.current_kst_date()
returns date
language sql
stable
as $$
  select timezone('Asia/Seoul', now())::date;
$$;

create or replace function public.current_active_season()
returns public.seasons
language sql
stable
as $$
  select s.*
  from public.seasons s
  where s.status = 'active'
    and now() >= s.starts_at
    and now() < s.ends_at
  order by s.starts_at asc
  limit 1;
$$;

create or replace function public.join_season(
  p_category text,
  p_initial_skills jsonb,
  p_initial_score numeric
)
returns public.season_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_season public.seasons;
  v_entry public.season_entries;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into v_season from public.current_active_season();
  if v_season.id is null then
    raise exception 'NO_ACTIVE_SEASON';
  end if;

  if p_category not in ('hitter', 'pitcher_starter') then
    raise exception 'INVALID_CATEGORY';
  end if;

  insert into public.season_entries (
    user_id,
    season_id,
    category,
    current_skills,
    current_score,
    score_reached_at
  ) values (
    v_user_id,
    v_season.id,
    p_category,
    p_initial_skills,
    p_initial_score,
    now()
  )
  returning * into v_entry;

  return v_entry;
exception
  when unique_violation then
    raise exception 'SEASON_ENTRY_ALREADY_EXISTS';
end;
$$;

create or replace function public.submit_daily_rank_roll(
  p_entry_id uuid,
  p_before_skills jsonb,
  p_rolled_skills jsonb,
  p_selected_result text,
  p_final_skills jsonb,
  p_final_score numeric
)
returns public.season_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_entry public.season_entries;
  v_roll_date_kst date := public.current_kst_date();
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_selected_result not in ('keep', 'replace') then
    raise exception 'INVALID_SELECTION';
  end if;

  select * into v_entry
  from public.season_entries
  where id = p_entry_id
    and user_id = v_user_id;

  if v_entry.id is null then
    raise exception 'ENTRY_NOT_FOUND';
  end if;

  insert into public.daily_roll_logs (
    entry_id,
    roll_date_kst,
    before_skills,
    rolled_skills,
    selected_result,
    final_skills,
    final_score
  ) values (
    p_entry_id,
    v_roll_date_kst,
    p_before_skills,
    p_rolled_skills,
    p_selected_result,
    p_final_skills,
    p_final_score
  );

  update public.season_entries
  set current_skills = p_final_skills,
      current_score = p_final_score,
      score_reached_at = case
        when p_final_score > current_score then now()
        else score_reached_at
      end,
      updated_at = now()
  where id = p_entry_id
  returning * into v_entry;

  return v_entry;
exception
  when unique_violation then
    raise exception 'DAILY_ROLL_ALREADY_USED';
end;
$$;

create or replace view public.season_rankings as
select
  se.id as entry_id,
  se.season_id,
  se.user_id,
  p.display_name,
  p.avatar_url,
  se.category,
  se.current_skills,
  se.current_score,
  se.score_reached_at,
  rank() over (
    partition by se.season_id, se.category
    order by se.current_score desc, se.score_reached_at asc
  ) as rank_position
from public.season_entries se
join public.profiles p on p.id = se.user_id;

alter table public.profiles enable row level security;
alter table public.seasons enable row level security;
alter table public.season_entries enable row level security;
alter table public.daily_roll_logs enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "seasons_select_all"
  on public.seasons
  for select
  to authenticated, anon
  using (true);

create policy "season_entries_select_all"
  on public.season_entries
  for select
  to authenticated, anon
  using (true);

create policy "daily_roll_logs_select_own"
  on public.daily_roll_logs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.season_entries se
      where se.id = entry_id
        and se.user_id = auth.uid()
    )
  );

grant select on public.season_rankings to anon, authenticated;
grant execute on function public.current_kst_date() to anon, authenticated;
grant execute on function public.current_active_season() to anon, authenticated;
grant execute on function public.join_season(text, jsonb, numeric) to authenticated;
grant execute on function public.submit_daily_rank_roll(uuid, jsonb, jsonb, text, jsonb, numeric) to authenticated;
