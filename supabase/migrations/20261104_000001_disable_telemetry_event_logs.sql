-- Stop accumulating page/ad analytics and idle game telemetry.
-- Keep the tables and compatibility RPCs so old clients and the admin
-- summary endpoint continue to work, but leave the event tables empty.

do $$
begin
  if to_regclass('public.revenue_events') is not null then
    execute 'truncate table public.revenue_events restart identity';
  end if;

  if to_regclass('public.idle_dev_game_events') is not null then
    execute 'truncate table public.idle_dev_game_events';
  end if;

  if to_regclass('public.idle_dev_game_daily_summary') is not null then
    execute 'truncate table public.idle_dev_game_daily_summary';
  end if;
end;
$$;

create or replace function public.log_revenue_event(
  p_event_type text,
  p_session_id text default null,
  p_page_path text default null,
  p_page_view text default null,
  p_device_type text default null,
  p_viewport_width integer default null,
  p_viewport_height integer default null,
  p_ad_slot text default null,
  p_ad_unit text default null,
  p_ad_width integer default null,
  p_ad_height integer default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  return;
end;
$$;

create or replace function public.idle_dev_game_log_event(
  p_player_id uuid,
  p_anon_id text,
  p_event_type text,
  p_tier text default null,
  p_training_delta numeric default null,
  p_total_training numeric default null,
  p_swing_count integer default null,
  p_homerun_count integer default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  return;
end;
$$;
