create table if not exists public.idle_dev_game_players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  anon_id text,
  display_name text,
  current_tier text not null default 'LIVE'
    check (current_tier in ('LIVE', 'IMPACT', 'SIGNATURE', 'GOLDEN GLOVE', 'MLB')),
  total_training numeric(18, 0) not null default 0 check (total_training >= 0),
  swing_count integer not null default 0 check (swing_count >= 0),
  homerun_count integer not null default 0 check (homerun_count >= 0),
  mlb_success_count integer not null default 0 check (mlb_success_count >= 0),
  best_swing_training numeric(18, 0) not null default 0 check (best_swing_training >= 0),
  best_homerun_training numeric(18, 0) not null default 0 check (best_homerun_training >= 0),
  best_total_level integer not null default 0 check (best_total_level >= 0),
  last_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint idle_dev_game_player_identity check (user_id is not null or nullif(anon_id, '') is not null)
);

create unique index if not exists idx_idle_dev_game_players_user
  on public.idle_dev_game_players (user_id)
  where user_id is not null;

create unique index if not exists idx_idle_dev_game_players_anon
  on public.idle_dev_game_players (anon_id)
  where anon_id is not null;

create index if not exists idx_idle_dev_game_players_mlb
  on public.idle_dev_game_players (mlb_success_count desc, updated_at desc);

create table if not exists public.idle_dev_game_events (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.idle_dev_game_players (id) on delete set null,
  user_id uuid references public.profiles (id) on delete set null,
  anon_id text,
  event_type text not null check (
    event_type in (
      'session_start',
      'swing',
      'homerun',
      'train',
      'redistribute',
      'skill_roll',
      'promote',
      'mlb_success'
    )
  ),
  tier text,
  training_delta numeric(18, 0),
  total_training numeric(18, 0),
  swing_count integer,
  homerun_count integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_idle_dev_game_events_type_time
  on public.idle_dev_game_events (event_type, created_at desc);

create index if not exists idx_idle_dev_game_events_player_time
  on public.idle_dev_game_events (player_id, created_at desc);

create table if not exists public.idle_dev_game_leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.idle_dev_game_players (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  anon_id text,
  display_name text not null,
  category text not null check (
    category in (
      'mlb_success_count',
      'best_homerun_training',
      'best_swing_training',
      'total_training',
      'fastest_mlb_seconds'
    )
  ),
  score numeric(18, 2) not null,
  score_label text,
  metadata jsonb not null default '{}'::jsonb,
  achieved_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id, category)
);

create index if not exists idx_idle_dev_game_leaderboard_rank
  on public.idle_dev_game_leaderboard_entries (category, score desc, achieved_at asc);

create table if not exists public.idle_dev_game_daily_summary (
  metric_date date primary key,
  session_starts integer not null default 0,
  swings integer not null default 0,
  homeruns integer not null default 0,
  trainings integer not null default 0,
  redistributions integer not null default 0,
  skill_rolls integer not null default 0,
  promotions integer not null default 0,
  mlb_successes integer not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function public.idle_dev_game_kst_date(p_time timestamptz default now())
returns date
language sql
stable
as $$
  select timezone('Asia/Seoul', p_time)::date;
$$;

create or replace function public.idle_dev_game_touch_summary(p_event_type text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date := public.idle_dev_game_kst_date();
begin
  insert into public.idle_dev_game_daily_summary (
    metric_date,
    session_starts,
    swings,
    homeruns,
    trainings,
    redistributions,
    skill_rolls,
    promotions,
    mlb_successes
  ) values (
    v_date,
    case when p_event_type = 'session_start' then 1 else 0 end,
    case when p_event_type = 'swing' then 1 else 0 end,
    case when p_event_type = 'homerun' then 1 else 0 end,
    case when p_event_type = 'train' then 1 else 0 end,
    case when p_event_type = 'redistribute' then 1 else 0 end,
    case when p_event_type = 'skill_roll' then 1 else 0 end,
    case when p_event_type = 'promote' then 1 else 0 end,
    case when p_event_type = 'mlb_success' then 1 else 0 end
  )
  on conflict (metric_date) do update
  set session_starts = idle_dev_game_daily_summary.session_starts + excluded.session_starts,
      swings = idle_dev_game_daily_summary.swings + excluded.swings,
      homeruns = idle_dev_game_daily_summary.homeruns + excluded.homeruns,
      trainings = idle_dev_game_daily_summary.trainings + excluded.trainings,
      redistributions = idle_dev_game_daily_summary.redistributions + excluded.redistributions,
      skill_rolls = idle_dev_game_daily_summary.skill_rolls + excluded.skill_rolls,
      promotions = idle_dev_game_daily_summary.promotions + excluded.promotions,
      mlb_successes = idle_dev_game_daily_summary.mlb_successes + excluded.mlb_successes,
      updated_at = now();
end;
$$;

create or replace function public.idle_dev_game_upsert_player(
  p_anon_id text,
  p_display_name text default null,
  p_state jsonb default '{}'::jsonb
)
returns public.idle_dev_game_players
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_player public.idle_dev_game_players;
begin
  if v_user_id is null and nullif(p_anon_id, '') is null then
    raise exception 'PLAYER_ID_REQUIRED';
  end if;

  if v_user_id is not null then
    update public.idle_dev_game_players
    set display_name = coalesce(nullif(p_display_name, ''), display_name),
        last_state = coalesce(p_state, '{}'::jsonb),
        updated_at = now()
    where user_id = v_user_id
    returning * into v_player;

    if v_player.id is not null then
      return v_player;
    end if;

    if nullif(p_anon_id, '') is not null then
      update public.idle_dev_game_players
      set user_id = v_user_id,
          display_name = coalesce(nullif(p_display_name, ''), display_name),
          last_state = coalesce(p_state, '{}'::jsonb),
          updated_at = now()
      where anon_id = nullif(p_anon_id, '')
        and user_id is null
      returning * into v_player;
    end if;

    if v_player.id is null then
      insert into public.idle_dev_game_players (
        user_id,
        anon_id,
        display_name,
        last_state
      ) values (
        v_user_id,
        nullif(p_anon_id, ''),
        nullif(p_display_name, ''),
        coalesce(p_state, '{}'::jsonb)
      )
      on conflict (user_id) where user_id is not null do update
      set display_name = coalesce(nullif(excluded.display_name, ''), idle_dev_game_players.display_name),
          last_state = excluded.last_state,
          updated_at = now()
      returning * into v_player;
    end if;
  else
    insert into public.idle_dev_game_players (
      user_id,
      anon_id,
      display_name,
      last_state
    ) values (
      v_user_id,
      nullif(p_anon_id, ''),
      nullif(p_display_name, ''),
      coalesce(p_state, '{}'::jsonb)
    )
    on conflict (anon_id) where anon_id is not null do update
    set display_name = coalesce(nullif(excluded.display_name, ''), idle_dev_game_players.display_name),
        last_state = excluded.last_state,
        updated_at = now()
    returning * into v_player;
  end if;

  return v_player;
end;
$$;

create or replace function public.idle_dev_game_log_event(
  p_player_id uuid,
  p_anon_id text,
  p_event_type text,
  p_tier text default null,
  p_training_delta numeric default null,
  p_total_training numeric default null,
  p_swing_count integer default null,
  p_homerun_count integer default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.idle_dev_game_events (
    player_id,
    user_id,
    anon_id,
    event_type,
    tier,
    training_delta,
    total_training,
    swing_count,
    homerun_count,
    metadata
  ) values (
    p_player_id,
    auth.uid(),
    nullif(p_anon_id, ''),
    p_event_type,
    p_tier,
    p_training_delta,
    p_total_training,
    p_swing_count,
    p_homerun_count,
    coalesce(p_metadata, '{}'::jsonb)
  );

  perform public.idle_dev_game_touch_summary(p_event_type);
end;
$$;

create or replace function public.idle_dev_game_submit_leaderboard_score(
  p_player_id uuid,
  p_anon_id text,
  p_display_name text,
  p_category text,
  p_score numeric,
  p_score_label text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.idle_dev_game_leaderboard_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.idle_dev_game_players;
  v_entry public.idle_dev_game_leaderboard_entries;
begin
  if p_category not in (
    'mlb_success_count',
    'best_homerun_training',
    'best_swing_training',
    'total_training',
    'fastest_mlb_seconds'
  ) then
    raise exception 'INVALID_CATEGORY';
  end if;

  select *
    into v_player
  from public.idle_dev_game_players
  where id = p_player_id
    and (
      auth.uid() is null
      or user_id is null
      or user_id = auth.uid()
    )
  limit 1;

  if v_player.id is null then
    raise exception 'PLAYER_NOT_FOUND';
  end if;

  insert into public.idle_dev_game_leaderboard_entries (
    player_id,
    user_id,
    anon_id,
    display_name,
    category,
    score,
    score_label,
    metadata
  ) values (
    v_player.id,
    v_player.user_id,
    coalesce(nullif(p_anon_id, ''), v_player.anon_id),
    coalesce(nullif(p_display_name, ''), v_player.display_name, '익명 선수'),
    p_category,
    p_score,
    p_score_label,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (player_id, category) do update
  set display_name = excluded.display_name,
      score = case
        when excluded.category = 'fastest_mlb_seconds' then least(idle_dev_game_leaderboard_entries.score, excluded.score)
        else greatest(idle_dev_game_leaderboard_entries.score, excluded.score)
      end,
      score_label = excluded.score_label,
      metadata = excluded.metadata,
      achieved_at = case
        when (
          excluded.category = 'fastest_mlb_seconds'
          and excluded.score < idle_dev_game_leaderboard_entries.score
        ) or (
          excluded.category <> 'fastest_mlb_seconds'
          and excluded.score > idle_dev_game_leaderboard_entries.score
        )
        then now()
        else idle_dev_game_leaderboard_entries.achieved_at
      end,
      updated_at = now()
  returning * into v_entry;

  return v_entry;
end;
$$;

create or replace view public.idle_dev_game_public_stats as
select
  coalesce(sum(mlb_success_count), 0)::bigint as mlb_success_count,
  count(*)::bigint as player_count,
  coalesce(sum(swing_count), 0)::bigint as swing_count,
  coalesce(sum(homerun_count), 0)::bigint as homerun_count
from public.idle_dev_game_players;

create or replace function public.idle_dev_game_get_leaderboard(
  p_category text,
  p_limit integer default 50
)
returns table (
  rank bigint,
  display_name text,
  score numeric,
  score_label text,
  achieved_at timestamptz
)
language sql
stable
as $$
  select
    row_number() over (order by e.score desc, e.achieved_at asc) as rank,
    e.display_name,
    e.score,
    e.score_label,
    e.achieved_at
  from public.idle_dev_game_leaderboard_entries e
  where e.category = p_category
  order by e.score desc, e.achieved_at asc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

alter table public.idle_dev_game_players enable row level security;
alter table public.idle_dev_game_events enable row level security;
alter table public.idle_dev_game_leaderboard_entries enable row level security;
alter table public.idle_dev_game_daily_summary enable row level security;

drop policy if exists "idle_dev_game_players_public_read" on public.idle_dev_game_players;
create policy "idle_dev_game_players_public_read"
  on public.idle_dev_game_players for select
  to anon, authenticated
  using (true);

drop policy if exists "idle_dev_game_events_no_direct_read" on public.idle_dev_game_events;
create policy "idle_dev_game_events_no_direct_read"
  on public.idle_dev_game_events for select
  to authenticated
  using (false);

drop policy if exists "idle_dev_game_leaderboard_public_read" on public.idle_dev_game_leaderboard_entries;
create policy "idle_dev_game_leaderboard_public_read"
  on public.idle_dev_game_leaderboard_entries for select
  to anon, authenticated
  using (true);

grant select on public.idle_dev_game_public_stats to anon, authenticated;
grant execute on function public.idle_dev_game_upsert_player(text, text, jsonb) to anon, authenticated;
grant execute on function public.idle_dev_game_log_event(uuid, text, text, text, numeric, numeric, integer, integer, jsonb) to anon, authenticated;
grant execute on function public.idle_dev_game_submit_leaderboard_score(uuid, text, text, text, numeric, text, jsonb) to anon, authenticated;
grant execute on function public.idle_dev_game_get_leaderboard(text, integer) to anon, authenticated;
