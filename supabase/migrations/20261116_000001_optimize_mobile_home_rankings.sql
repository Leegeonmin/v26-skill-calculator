create or replace function public.get_mobile_home_top_rankings(
  p_category text,
  p_limit integer default 3
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_season public.seasons;
  v_limit integer := least(greatest(coalesce(p_limit, 3), 1), 10);
  v_rankings jsonb := '[]'::jsonb;
begin
  if p_category not in ('hitter', 'pitcher_starter') then
    raise exception 'INVALID_CATEGORY';
  end if;

  select *
  into v_season
  from public.current_active_season();

  if v_season.id is null then
    return '[]'::jsonb;
  end if;

  with top_entries as (
    select
      entry.id as entry_id,
      entry.season_id,
      entry.user_id,
      profile.display_name,
      profile.avatar_url,
      entry.category,
      entry.current_skills,
      entry.current_score,
      entry.score_reached_at
    from public.season_entries entry
    join public.profiles profile on profile.id = entry.user_id
    where entry.season_id = v_season.id
      and entry.category = p_category
    order by entry.current_score desc, entry.score_reached_at asc
    limit v_limit
  ), ranked_entries as (
    select
      top_entries.*,
      rank() over (order by current_score desc, score_reached_at asc) as rank_position
    from top_entries
  )
  select coalesce(jsonb_agg(to_jsonb(ranked_entries) order by rank_position), '[]'::jsonb)
  into v_rankings
  from ranked_entries;

  return v_rankings;
end;
$$;

grant execute on function public.get_mobile_home_top_rankings(text, integer) to anon, authenticated;
