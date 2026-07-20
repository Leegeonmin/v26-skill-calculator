alter table public.idle_dev_game_players
  add column if not exists first_mlb_seconds numeric(18, 2);

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

create or replace function public.get_idle_dev_game_config()
returns table (
  enabled boolean,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    coalesce((select value = 'true' from public.site_settings where key = 'idle_dev_game_enabled'), false) as enabled,
    (select updated_at from public.site_settings where key = 'idle_dev_game_enabled') as updated_at;
$$;

create or replace function public.admin_get_idle_dev_game_setting(
  p_session_token uuid
)
returns table (
  enabled boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not exists (
    select 1
    from public.admin_sessions s
    where s.session_token = p_session_token
      and s.expires_at > now()
  ) then
    raise exception 'INVALID_ADMIN_SESSION';
  end if;

  return query select * from public.get_idle_dev_game_config();
end;
$$;

create or replace function public.admin_update_idle_dev_game_setting(
  p_session_token uuid,
  p_enabled boolean
)
returns table (
  enabled boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.admin_sessions s
    where s.session_token = p_session_token
      and s.expires_at > now()
  ) then
    raise exception 'INVALID_ADMIN_SESSION';
  end if;

  insert into public.site_settings (key, value, updated_at)
  values ('idle_dev_game_enabled', case when p_enabled then 'true' else 'false' end, now())
  on conflict (key) do update
    set value = excluded.value,
        updated_at = excluded.updated_at;

  return query select * from public.get_idle_dev_game_config();
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
  v_first_mlb_seconds numeric := nullif((p_progress ->> 'firstMlbSeconds')::numeric, 0);
begin
  if v_user_id is null then
    raise exception 'LOGIN_REQUIRED_FOR_OFFICIAL_IDLE_GAME_RECORD';
  end if;

  v_homerun_count := least(v_homerun_count, v_swing_count);
  if v_first_mlb_seconds is not null then
    v_first_mlb_seconds := least(greatest(v_first_mlb_seconds, 30), 31536000);
  end if;

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
      first_mlb_seconds = case
        when v_first_mlb_seconds is null then first_mlb_seconds
        when first_mlb_seconds is null then v_first_mlb_seconds
        else least(first_mlb_seconds, v_first_mlb_seconds)
      end,
      last_state = coalesce(p_state, last_state),
      updated_at = now()
  where id = v_player.id
  returning * into v_player;

  return v_player;
end;
$$;

create or replace view public.idle_dev_game_public_stats as
select
  coalesce(sum(mlb_success_count), 0)::bigint as mlb_success_count,
  count(*)::bigint as player_count,
  coalesce(sum(swing_count), 0)::bigint as swing_count,
  coalesce(sum(homerun_count), 0)::bigint as homerun_count
from public.idle_dev_game_players
where user_id is not null;

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
    row_number() over (
      order by
        case when e.category = 'fastest_mlb_seconds' then e.score end asc,
        case when e.category <> 'fastest_mlb_seconds' then e.score end desc,
        e.achieved_at asc
    ) as rank,
    e.display_name,
    e.score,
    e.score_label,
    e.achieved_at
  from public.idle_dev_game_leaderboard_entries e
  where e.category = p_category
    and e.user_id is not null
  order by
    case when e.category = 'fastest_mlb_seconds' then e.score end asc,
    case when e.category <> 'fastest_mlb_seconds' then e.score end desc,
    e.achieved_at asc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

grant execute on function public.get_idle_dev_game_config() to anon, authenticated;
grant execute on function public.admin_get_idle_dev_game_setting(uuid) to anon, authenticated;
grant execute on function public.admin_update_idle_dev_game_setting(uuid, boolean) to anon, authenticated;
grant execute on function public.idle_dev_game_clean_display_name(text) to anon, authenticated;

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
    public.idle_dev_game_clean_display_name(coalesce(nullif(p_display_name, ''), v_player.display_name, '익명타자')),
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

grant execute on function public.idle_dev_game_submit_leaderboard_score(uuid, text, text, text, numeric, text, jsonb) to anon, authenticated;
