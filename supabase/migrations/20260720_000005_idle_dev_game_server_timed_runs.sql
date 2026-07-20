create table if not exists public.idle_dev_game_official_runs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.idle_dev_game_players (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  anon_id text,
  status text not null default 'active' check (status in ('active', 'succeeded', 'abandoned')),
  started_at timestamptz not null default now(),
  achieved_at timestamptz,
  elapsed_seconds numeric(18, 2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_idle_dev_game_active_run_user
  on public.idle_dev_game_official_runs (user_id)
  where status = 'active';

create index if not exists idx_idle_dev_game_official_runs_fastest
  on public.idle_dev_game_official_runs (status, elapsed_seconds asc, achieved_at asc)
  where status = 'succeeded';

create index if not exists idx_idle_dev_game_fastest_mlb
  on public.idle_dev_game_leaderboard_entries (category, score asc, achieved_at asc)
  where category = 'fastest_mlb_seconds' and user_id is not null;

create or replace function public.idle_dev_game_clean_display_name(p_name text)
returns text
language plpgsql
immutable
as $$
declare
  v_name text := left(regexp_replace(coalesce(p_name, ''), '[^0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ]', '', 'g'), 8);
begin
  if length(v_name) < 2 then
    return '익명타자';
  end if;

  if v_name ~* '(시발|씨발|ㅅㅂ|병신|븅신|개새|좆|지랄|fuck|shit|sex|admin|관리자|운영자|카톡|오픈채팅|텔레그램)' then
    return '익명타자';
  end if;

  return v_name;
end;
$$;

alter table public.idle_dev_game_official_runs enable row level security;

drop policy if exists "idle_dev_game_official_runs_no_direct_read" on public.idle_dev_game_official_runs;
create policy "idle_dev_game_official_runs_no_direct_read"
  on public.idle_dev_game_official_runs for select
  to authenticated
  using (false);

create or replace function public.idle_dev_game_start_official_run(
  p_player_id uuid,
  p_anon_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_player public.idle_dev_game_players;
  v_run public.idle_dev_game_official_runs;
begin
  if v_user_id is null then
    raise exception 'LOGIN_REQUIRED_FOR_OFFICIAL_IDLE_GAME_RUN';
  end if;

  select *
    into v_player
  from public.idle_dev_game_players
  where id = p_player_id
    and user_id = v_user_id
  limit 1;

  if v_player.id is null then
    raise exception 'PLAYER_NOT_FOUND';
  end if;

  select *
    into v_run
  from public.idle_dev_game_official_runs
  where user_id = v_user_id
    and status = 'active'
  order by started_at desc
  limit 1;

  if v_run.id is null then
    insert into public.idle_dev_game_official_runs (
      player_id,
      user_id,
      anon_id,
      status
    ) values (
      v_player.id,
      v_user_id,
      nullif(p_anon_id, ''),
      'active'
    )
    returning * into v_run;
  end if;

  return jsonb_build_object(
    'runId', v_run.id,
    'startedAt', v_run.started_at,
    'status', v_run.status
  );
end;
$$;

create or replace function public.idle_dev_game_save_progress(
  p_anon_id text,
  p_display_name text default null,
  p_state jsonb default '{}'::jsonb,
  p_progress jsonb default '{}'::jsonb
)
returns public.idle_dev_game_players
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.idle_dev_game_players;
  v_user_id uuid := auth.uid();
  v_total_training numeric := least(greatest(coalesce((p_progress ->> 'totalTraining')::numeric, 0), 0), 1000000000000);
  v_swing_count integer := least(greatest(coalesce((p_progress ->> 'swingCount')::integer, 0), 0), 10000000);
  v_homerun_count integer := least(greatest(coalesce((p_progress ->> 'homerunCount')::integer, 0), 0), 10000000);
  v_mlb_success_count integer := least(greatest(coalesce((p_progress ->> 'mlbSuccessCount')::integer, 0), 0), 100000);
  v_best_swing_training numeric := least(greatest(coalesce((p_progress ->> 'bestSwingTraining')::numeric, 0), 0), 1000000000000);
  v_best_homerun_training numeric := least(greatest(coalesce((p_progress ->> 'bestHomerunTraining')::numeric, 0), 0), 1000000000000);
  v_best_total_level integer := least(greatest(coalesce((p_progress ->> 'bestTotalLevel')::integer, 0), 0), 150);
begin
  if v_user_id is null then
    raise exception 'LOGIN_REQUIRED_FOR_OFFICIAL_IDLE_GAME_RECORD';
  end if;

  v_homerun_count := least(v_homerun_count, v_swing_count);

  v_player := public.idle_dev_game_upsert_player(
    p_anon_id,
    public.idle_dev_game_clean_display_name(p_display_name),
    p_state
  );

  update public.idle_dev_game_players
  set display_name = public.idle_dev_game_clean_display_name(p_display_name),
      current_tier = coalesce(nullif(p_progress ->> 'currentTier', ''), current_tier),
      total_training = greatest(v_total_training, total_training),
      swing_count = greatest(v_swing_count, swing_count),
      homerun_count = greatest(v_homerun_count, homerun_count),
      mlb_success_count = greatest(v_mlb_success_count, mlb_success_count),
      best_swing_training = greatest(v_best_swing_training, best_swing_training),
      best_homerun_training = greatest(v_best_homerun_training, best_homerun_training),
      best_total_level = greatest(v_best_total_level, best_total_level),
      last_state = coalesce(p_state, last_state),
      updated_at = now()
  where id = v_player.id
  returning * into v_player;

  return v_player;
end;
$$;

create or replace function public.idle_dev_game_complete_official_run(
  p_anon_id text,
  p_display_name text default null,
  p_state jsonb default '{}'::jsonb,
  p_progress jsonb default '{}'::jsonb,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_player public.idle_dev_game_players;
  v_run public.idle_dev_game_official_runs;
  v_entry public.idle_dev_game_leaderboard_entries;
  v_elapsed numeric;
  v_score_label text;
begin
  if v_user_id is null then
    raise exception 'LOGIN_REQUIRED_FOR_OFFICIAL_IDLE_GAME_RUN';
  end if;

  v_player := public.idle_dev_game_save_progress(
    p_anon_id,
    p_display_name,
    p_state,
    coalesce(p_progress, '{}'::jsonb) - 'firstMlbSeconds'
  );

  select *
    into v_run
  from public.idle_dev_game_official_runs
  where user_id = v_user_id
    and player_id = v_player.id
    and status = 'active'
  order by started_at desc
  limit 1;

  if v_run.id is null then
    raise exception 'OFFICIAL_RUN_NOT_STARTED';
  end if;

  v_elapsed := round(extract(epoch from (now() - v_run.started_at))::numeric, 2);

  if v_elapsed < 30 then
    raise exception 'OFFICIAL_RUN_TOO_FAST';
  end if;

  update public.idle_dev_game_official_runs
  set status = 'succeeded',
      achieved_at = now(),
      elapsed_seconds = v_elapsed,
      metadata = coalesce(p_metadata, '{}'::jsonb),
      updated_at = now()
  where id = v_run.id
  returning * into v_run;

  update public.idle_dev_game_players
  set first_mlb_seconds = case
        when first_mlb_seconds is null then v_elapsed
        else least(first_mlb_seconds, v_elapsed)
      end,
      updated_at = now()
  where id = v_player.id
  returning * into v_player;

  v_score_label := concat(round(v_elapsed)::text, '초');

  v_entry := public.idle_dev_game_submit_leaderboard_score(
    v_player.id,
    p_anon_id,
    public.idle_dev_game_clean_display_name(p_display_name),
    'fastest_mlb_seconds',
    v_elapsed,
    v_score_label,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'serverElapsedSeconds', v_elapsed,
      'officialRunId', v_run.id,
      'officialStartedAt', v_run.started_at,
      'officialAchievedAt', v_run.achieved_at
    )
  );

  return jsonb_build_object(
    'player', to_jsonb(v_player),
    'runId', v_run.id,
    'elapsedSeconds', v_elapsed,
    'scoreLabel', v_score_label,
    'leaderboardEntryId', v_entry.id
  );
end;
$$;

grant execute on function public.idle_dev_game_start_official_run(uuid, text) to authenticated;
grant execute on function public.idle_dev_game_complete_official_run(text, text, jsonb, jsonb, jsonb) to authenticated;
