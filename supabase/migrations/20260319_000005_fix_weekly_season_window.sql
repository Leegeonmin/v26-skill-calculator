create or replace function public.create_initial_season(
  p_name text default null
)
returns public.seasons
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.seasons;
  v_created public.seasons;
  v_now_kst timestamp := timezone('Asia/Seoul', now());
  v_week_start timestamp := date_trunc('week', v_now_kst);
  v_week_end timestamp := date_trunc('week', v_now_kst) + interval '7 days';
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
    coalesce(p_name, to_char(v_week_start, 'YYYY.MM.DD') || ' 주간 시즌'),
    timezone('Asia/Seoul', v_week_start),
    timezone('Asia/Seoul', v_week_end),
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
  v_next_start_kst timestamp;
  v_next_end_kst timestamp;
begin
  select * into v_last
  from public.seasons
  order by starts_at desc
  limit 1;

  if v_last.id is null then
    raise exception 'NO_EXISTING_SEASON';
  end if;

  v_next_start_kst := timezone('Asia/Seoul', v_last.ends_at);
  v_next_end_kst := v_next_start_kst + interval '7 days';

  insert into public.seasons (
    name,
    starts_at,
    ends_at,
    status
  ) values (
    coalesce(p_name, to_char(v_next_start_kst, 'YYYY.MM.DD') || ' 주간 시즌'),
    timezone('Asia/Seoul', v_next_start_kst),
    timezone('Asia/Seoul', v_next_end_kst),
    'upcoming'
  )
  returning * into v_created;

  return v_created;
end;
$$;
