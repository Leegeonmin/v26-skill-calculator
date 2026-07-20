create or replace function public.idle_dev_game_random_display_name()
returns text
language sql
volatile
as $$
  select concat(U&'\D0C0\C790', (1000 + floor(random() * 9000))::integer);
$$;

update public.idle_dev_game_players
set display_name = public.idle_dev_game_random_display_name(),
    updated_at = now();

update public.idle_dev_game_leaderboard_entries entry
set display_name = coalesce(player.display_name, public.idle_dev_game_random_display_name()),
    updated_at = now()
from public.idle_dev_game_players player
where player.id = entry.player_id;

update public.idle_dev_game_leaderboard_entries
set display_name = public.idle_dev_game_random_display_name(),
    updated_at = now()
where player_id is null;

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
    null,
    p_state
  );

  update public.idle_dev_game_players
  set display_name = coalesce(nullif(display_name, ''), public.idle_dev_game_random_display_name()),
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
  v_user_id uuid := auth.uid();
  v_display_name text;
begin
  if v_user_id is null then
    raise exception 'LOGIN_REQUIRED_FOR_OFFICIAL_IDLE_GAME_RANKING';
  end if;

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
    and user_id = v_user_id
  limit 1;

  if v_player.id is null then
    raise exception 'PLAYER_NOT_FOUND';
  end if;

  v_display_name := coalesce(nullif(v_player.display_name, ''), public.idle_dev_game_random_display_name());

  update public.idle_dev_game_players
  set display_name = v_display_name,
      updated_at = now()
  where id = v_player.id;

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
    v_display_name,
    p_category,
    case when p_category = 'fastest_mlb_seconds' then least(greatest(p_score, 30), 31536000) else p_score end,
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

grant execute on function public.idle_dev_game_random_display_name() to anon, authenticated;
