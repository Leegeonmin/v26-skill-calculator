alter table public.seasons
  add column if not exists season_number integer,
  add column if not exists competition_category text
    check (competition_category in ('hitter', 'pitcher_starter'));

with numbered_seasons as (
  select
    id,
    row_number() over (order by starts_at asc, created_at asc) as next_season_number
  from public.seasons
)
update public.seasons s
set season_number = numbered_seasons.next_season_number
from numbered_seasons
where s.id = numbered_seasons.id
  and s.season_number is null;

update public.seasons
set competition_category = case
  when season_number % 2 = 1 then 'pitcher_starter'
  else 'hitter'
end
where status = 'upcoming'
  and competition_category is null;

create table if not exists public.season_result_snapshots (
  season_id uuid primary key references public.seasons (id) on delete cascade,
  season_number integer not null,
  competition_category text check (competition_category in ('hitter', 'pitcher_starter')),
  season_name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.season_result_snapshot_rows (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.season_result_snapshots (season_id) on delete cascade,
  entry_id uuid not null references public.season_entries (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  display_name text,
  avatar_url text,
  category text not null check (category in ('hitter', 'pitcher_starter')),
  current_skills jsonb not null,
  current_score numeric not null,
  score_reached_at timestamptz not null,
  rank_position integer not null,
  participant_count integer not null,
  created_at timestamptz not null default now(),
  unique (season_id, entry_id),
  unique (season_id, user_id)
);

create index if not exists idx_season_result_snapshot_rows_user
  on public.season_result_snapshot_rows (user_id, season_id);

create index if not exists idx_season_result_snapshot_rows_rank
  on public.season_result_snapshot_rows (season_id, category, rank_position);

alter table public.season_result_snapshots enable row level security;
alter table public.season_result_snapshot_rows enable row level security;

drop policy if exists "season_result_snapshots_select_all" on public.season_result_snapshots;
create policy "season_result_snapshots_select_all"
  on public.season_result_snapshots
  for select
  to anon, authenticated
  using (true);

drop policy if exists "season_result_snapshot_rows_select_all" on public.season_result_snapshot_rows;
create policy "season_result_snapshot_rows_select_all"
  on public.season_result_snapshot_rows
  for select
  to anon, authenticated
  using (true);

create or replace function public.snapshot_ended_season(
  p_season_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_season public.seasons;
  v_season_number integer;
begin
  select *
  into v_season
  from public.seasons
  where id = p_season_id
    and status = 'ended';

  if v_season.id is null then
    return;
  end if;

  if exists (
    select 1
    from public.season_result_snapshots
    where season_id = v_season.id
  ) then
    return;
  end if;

  v_season_number := coalesce(v_season.season_number, 0);

  if v_season_number <= 0 then
    select count(*)::integer
    into v_season_number
    from public.seasons
    where starts_at <= v_season.starts_at;
  end if;

  insert into public.season_result_snapshots (
    season_id,
    season_number,
    competition_category,
    season_name,
    starts_at,
    ends_at
  ) values (
    v_season.id,
    v_season_number,
    v_season.competition_category,
    v_season.name,
    v_season.starts_at,
    v_season.ends_at
  );

  insert into public.season_result_snapshot_rows (
    season_id,
    entry_id,
    user_id,
    display_name,
    avatar_url,
    category,
    current_skills,
    current_score,
    score_reached_at,
    rank_position,
    participant_count
  )
  select
    r.season_id,
    r.entry_id,
    r.user_id,
    r.display_name,
    r.avatar_url,
    r.category,
    r.current_skills,
    r.current_score,
    r.score_reached_at,
    r.rank_position::integer,
    count(*) over (partition by r.season_id, r.category)::integer as participant_count
  from public.season_rankings r
  where r.season_id = v_season.id;
end;
$$;

create or replace function public.snapshot_ended_seasons()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_season_id uuid;
begin
  for v_season_id in
    select s.id
    from public.seasons s
    where s.status = 'ended'
      and not exists (
        select 1
        from public.season_result_snapshots snapshot
        where snapshot.season_id = s.id
      )
    order by s.ends_at asc
  loop
    perform public.snapshot_ended_season(v_season_id);
  end loop;
end;
$$;

create or replace function public.get_my_ranking_archive(
  p_limit integer default 10
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 10), 1), 10);
  v_records jsonb := '[]'::jsonb;
  v_ranked_count integer := 0;
begin
  perform public.snapshot_ended_seasons();

  if v_user_id is null then
    return jsonb_build_object(
      'records', '[]'::jsonb,
      'ranked_count', 0
    );
  end if;

  with recent_snapshots as (
    select *
    from public.season_result_snapshots
    order by ends_at desc
    limit v_limit
  ),
  archive_records as (
    select
      s.season_id,
      s.season_number,
      s.competition_category,
      s.season_name,
      s.starts_at,
      s.ends_at,
      r.category,
      r.current_skills,
      r.current_score,
      r.score_reached_at,
      r.rank_position,
      r.participant_count,
      (r.id is not null) as participated
    from recent_snapshots s
    left join public.season_result_snapshot_rows r
      on r.season_id = s.season_id
     and r.user_id = v_user_id
    order by s.ends_at desc
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'season_id', season_id,
        'season_number', season_number,
        'competition_category', competition_category,
        'season_name', season_name,
        'starts_at', starts_at,
        'ends_at', ends_at,
        'participated', participated,
        'category', category,
        'current_skills', current_skills,
        'current_score', current_score,
        'score_reached_at', score_reached_at,
        'rank_position', rank_position,
        'participant_count', participant_count,
        'is_ranked', coalesce(rank_position <= 3, false)
      )
      order by ends_at desc
    ),
    '[]'::jsonb
  )
  into v_records
  from archive_records;

  select count(*)::integer
  into v_ranked_count
  from public.season_result_snapshot_rows
  where user_id = v_user_id
    and rank_position <= 3;

  return jsonb_build_object(
    'records', v_records,
    'ranked_count', v_ranked_count
  );
end;
$$;

create or replace function public.ensure_weekly_active_season()
returns public.seasons
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now_kst timestamp := timezone('Asia/Seoul', now());
  v_week_start timestamp := date_trunc('week', v_now_kst);
  v_week_end timestamp := v_week_start + interval '7 days';
  v_week_start_tz timestamptz := timezone('Asia/Seoul', v_week_start);
  v_week_end_tz timestamptz := timezone('Asia/Seoul', v_week_end);
  v_next_start_tz timestamptz := v_week_end_tz;
  v_next_end_tz timestamptz := timezone('Asia/Seoul', v_week_end + interval '7 days');
  v_current public.seasons;
  v_next_season_number integer;
begin
  update public.seasons
  set status = case
    when ends_at <= v_week_start_tz then 'ended'
    when starts_at = v_week_start_tz and ends_at = v_week_end_tz then 'active'
    when starts_at >= v_week_end_tz then 'upcoming'
    else status
  end
  where ends_at <= v_week_start_tz
    or (starts_at = v_week_start_tz and ends_at = v_week_end_tz)
    or starts_at >= v_week_end_tz;

  perform public.snapshot_ended_seasons();

  select * into v_current
  from public.seasons
  where starts_at = v_week_start_tz
    and ends_at = v_week_end_tz
  limit 1;

  if v_current.id is null then
    select coalesce(max(season_number), 0) + 1
    into v_next_season_number
    from public.seasons;

    insert into public.seasons (
      name,
      season_number,
      competition_category,
      starts_at,
      ends_at,
      status
    ) values (
      to_char(v_week_start, 'YYYY.MM.DD') || ' 주간 시즌',
      v_next_season_number,
      case
        when v_next_season_number % 2 = 1 then 'pitcher_starter'
        else 'hitter'
      end,
      v_week_start_tz,
      v_week_end_tz,
      'active'
    )
    returning * into v_current;
  elsif v_current.status <> 'active' then
    update public.seasons
    set status = 'active'
    where id = v_current.id
    returning * into v_current;
  end if;

  if not exists (
    select 1
    from public.seasons
    where starts_at = v_next_start_tz
      and ends_at = v_next_end_tz
  ) then
    select coalesce(max(season_number), 0) + 1
    into v_next_season_number
    from public.seasons;

    insert into public.seasons (
      name,
      season_number,
      competition_category,
      starts_at,
      ends_at,
      status
    ) values (
      to_char(v_week_end, 'YYYY.MM.DD') || ' 주간 시즌',
      v_next_season_number,
      case
        when v_next_season_number % 2 = 1 then 'pitcher_starter'
        else 'hitter'
      end,
      v_next_start_tz,
      v_next_end_tz,
      'upcoming'
    );
  end if;

  return v_current;
end;
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
  v_category text;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into v_season from public.current_active_season();
  if v_season.id is null then
    raise exception 'NO_ACTIVE_SEASON';
  end if;

  v_category := coalesce(v_season.competition_category, p_category);

  if v_category not in ('hitter', 'pitcher_starter') then
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
    v_category,
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

create or replace function public.get_ranking_home_snapshot(
  p_category text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_season public.seasons;
  v_entry public.season_entries;
  v_my_ranking jsonb;
  v_pending public.daily_roll_pending;
  v_today_roll_id uuid;
  v_rankings jsonb := '[]'::jsonb;
  v_hitter_count bigint := 0;
  v_pitcher_count bigint := 0;
  v_category text;
begin
  if p_category not in ('hitter', 'pitcher_starter') then
    raise exception 'INVALID_CATEGORY';
  end if;

  select *
  into v_season
  from public.current_active_season();

  if v_season.id is null then
    return jsonb_build_object(
      'season', null,
      'entry', null,
      'rankings', '[]'::jsonb,
      'my_ranking', null,
      'today_roll_log_id', null,
      'pending_roll', null,
      'participant_counts', jsonb_build_object(
        'hitter', 0,
        'pitcher_starter', 0
      )
    );
  end if;

  v_category := coalesce(v_season.competition_category, p_category);

  select count(*) into v_hitter_count
  from public.season_entries
  where season_id = v_season.id
    and category = 'hitter';

  select count(*) into v_pitcher_count
  from public.season_entries
  where season_id = v_season.id
    and category = 'pitcher_starter';

  select coalesce(jsonb_agg(to_jsonb(r) order by r.rank_position), '[]'::jsonb)
  into v_rankings
  from (
    select *
    from public.season_rankings
    where season_id = v_season.id
      and category = v_category
    order by rank_position asc
    limit 10
  ) r;

  if v_user_id is not null then
    select *
    into v_entry
    from public.season_entries
    where season_id = v_season.id
      and user_id = v_user_id
    limit 1;

    select to_jsonb(r)
    into v_my_ranking
    from public.season_rankings r
    where r.season_id = v_season.id
      and r.category = v_category
      and r.user_id = v_user_id
    limit 1;

    if v_entry.id is not null then
      select l.id
      into v_today_roll_id
      from public.daily_roll_logs l
      where l.entry_id = v_entry.id
        and l.roll_date_kst = public.current_kst_date()
      limit 1;

      select *
      into v_pending
      from public.daily_roll_pending p
      where p.entry_id = v_entry.id
        and p.roll_date_kst = public.current_kst_date()
      limit 1;
    end if;
  end if;

  return jsonb_build_object(
    'season', to_jsonb(v_season),
    'entry', case when v_entry.id is null then null else to_jsonb(v_entry) end,
    'rankings', v_rankings,
    'my_ranking', v_my_ranking,
    'today_roll_log_id', v_today_roll_id,
    'pending_roll', case when v_pending.id is null then null else to_jsonb(v_pending) end,
    'participant_counts', jsonb_build_object(
      'hitter', v_hitter_count,
      'pitcher_starter', v_pitcher_count
    )
  );
end;
$$;

grant select on public.season_result_snapshots to anon, authenticated;
grant select on public.season_result_snapshot_rows to anon, authenticated;
grant execute on function public.snapshot_ended_season(uuid) to anon, authenticated;
grant execute on function public.snapshot_ended_seasons() to anon, authenticated;
grant execute on function public.get_my_ranking_archive(integer) to authenticated;
grant execute on function public.ensure_weekly_active_season() to anon, authenticated;
grant execute on function public.join_season(text, jsonb, numeric) to authenticated;
grant execute on function public.get_ranking_home_snapshot(text) to anon, authenticated;
