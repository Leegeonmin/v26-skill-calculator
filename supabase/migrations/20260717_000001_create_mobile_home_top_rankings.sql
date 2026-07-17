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

  select coalesce(jsonb_agg(to_jsonb(r) order by r.rank_position), '[]'::jsonb)
  into v_rankings
  from (
    select *
    from public.season_rankings
    where season_id = v_season.id
      and category = p_category
    order by rank_position asc
    limit v_limit
  ) r;

  return v_rankings;
end;
$$;

grant execute on function public.get_mobile_home_top_rankings(text, integer) to anon, authenticated;
