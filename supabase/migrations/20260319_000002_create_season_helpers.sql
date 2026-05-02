create or replace function public.create_initial_season(
  p_name text default 'Season 1'
)
returns public.seasons
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.seasons;
  v_created public.seasons;
begin
  select * into v_existing
  from public.seasons
  order by starts_at asc
  limit 1;

  if v_existing.id is not null then
    raise exception 'INITIAL_SEASON_ALREADY_EXISTS';
  end if;

  insert into public.seasons (
    name,
    starts_at,
    ends_at,
    status
  ) values (
    p_name,
    now(),
    now() + interval '7 days',
    'active'
  )
  returning * into v_created;

  return v_created;
end;
$$;

create or replace function public.create_next_season(
  p_name text default null
)
returns public.seasons
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last public.seasons;
  v_created public.seasons;
begin
  select * into v_last
  from public.seasons
  order by starts_at desc
  limit 1;

  if v_last.id is null then
    raise exception 'NO_EXISTING_SEASON';
  end if;

  insert into public.seasons (
    name,
    starts_at,
    ends_at,
    status
  ) values (
    coalesce(p_name, 'Season ' || to_char((extract(epoch from now()))::bigint, 'FM999999999999')),
    v_last.ends_at,
    v_last.ends_at + interval '7 days',
    'upcoming'
  )
  returning * into v_created;

  return v_created;
end;
$$;

grant execute on function public.create_initial_season(text) to authenticated;
grant execute on function public.create_next_season(text) to authenticated;
