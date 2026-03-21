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
      and category = p_category
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
      and r.category = p_category
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

grant execute on function public.get_ranking_home_snapshot(text) to anon, authenticated;
