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

  select * into v_current
  from public.seasons
  where starts_at = v_week_start_tz
    and ends_at = v_week_end_tz
  limit 1;

  if v_current.id is null then
    insert into public.seasons (
      name,
      starts_at,
      ends_at,
      status
    ) values (
      to_char(v_week_start, 'YYYY.MM.DD') || ' 주간 시즌',
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
    insert into public.seasons (
      name,
      starts_at,
      ends_at,
      status
    ) values (
      to_char(v_week_end, 'YYYY.MM.DD') || ' 주간 시즌',
      v_next_start_tz,
      v_next_end_tz,
      'upcoming'
    );
  end if;

  return v_current;
end;
$$;

grant execute on function public.ensure_weekly_active_season() to anon, authenticated;
