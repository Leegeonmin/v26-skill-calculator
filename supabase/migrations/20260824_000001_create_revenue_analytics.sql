do $$
begin
  if to_regclass('public.tool_usage_events') is not null then
    truncate table public.tool_usage_events restart identity;
  end if;

  if to_regclass('public.admin_daily_usage_summary') is not null then
    truncate table public.admin_daily_usage_summary;
  end if;

  if to_regclass('public.admin_daily_usage_sessions') is not null then
    truncate table public.admin_daily_usage_sessions;
  end if;

  if to_regclass('public.admin_daily_tool_summary') is not null then
    truncate table public.admin_daily_tool_summary;
  end if;

  if to_regclass('public.admin_daily_tool_sessions') is not null then
    truncate table public.admin_daily_tool_sessions;
  end if;

  if to_regclass('public.admin_daily_ocr_summary') is not null then
    truncate table public.admin_daily_ocr_summary;
  end if;

  if to_regclass('public.admin_daily_ocr_sessions') is not null then
    truncate table public.admin_daily_ocr_sessions;
  end if;
end;
$$;

create table if not exists public.revenue_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  event_type text not null check (event_type in ('page_view', 'ad_viewable')),
  session_id text,
  page_path text,
  page_view text,
  device_type text,
  viewport_width integer,
  viewport_height integer,
  ad_slot text,
  ad_unit text,
  ad_width integer,
  ad_height integer,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_revenue_events_created_at
  on public.revenue_events (created_at desc);

create index if not exists idx_revenue_events_event_type_created_at
  on public.revenue_events (event_type, created_at desc);

create index if not exists idx_revenue_events_page_view_created_at
  on public.revenue_events (page_view, created_at desc);

create index if not exists idx_revenue_events_ad_slot_created_at
  on public.revenue_events (ad_slot, created_at desc);

revoke all on public.revenue_events from anon, authenticated;

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
  if p_event_type not in ('page_view', 'ad_viewable') then
    raise exception 'INVALID_REVENUE_EVENT_TYPE';
  end if;

  insert into public.revenue_events (
    event_type,
    session_id,
    page_path,
    page_view,
    device_type,
    viewport_width,
    viewport_height,
    ad_slot,
    ad_unit,
    ad_width,
    ad_height,
    metadata
  ) values (
    p_event_type,
    nullif(p_session_id, ''),
    nullif(p_page_path, ''),
    nullif(p_page_view, ''),
    nullif(p_device_type, ''),
    p_viewport_width,
    p_viewport_height,
    nullif(p_ad_slot, ''),
    nullif(p_ad_unit, ''),
    p_ad_width,
    p_ad_height,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

drop function if exists public.admin_get_tool_usage_summary(uuid);

create or replace function public.admin_get_tool_usage_summary(
  p_session_token uuid
)
returns table (
  today_events bigint,
  unique_sessions bigint,
  page_views bigint,
  ad_viewable_events bigint,
  mobile_events bigint,
  desktop_events bigint,
  ad_breakdown jsonb,
  page_breakdown jsonb,
  recent_inquiries jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today_start timestamptz := ((now() at time zone 'Asia/Seoul')::date::timestamp at time zone 'Asia/Seoul');
begin
  if not exists (
    select 1
    from public.admin_sessions s
    where s.session_token = p_session_token
      and s.expires_at > now()
  ) then
    raise exception 'INVALID_ADMIN_SESSION';
  end if;

  return query
  with today_events as (
    select *
    from public.revenue_events e
    where e.created_at >= v_today_start
  ),
  summary as (
    select
      count(*)::bigint as today_events,
      count(distinct e.session_id)::bigint as unique_sessions,
      count(*) filter (where e.event_type = 'page_view')::bigint as page_views,
      count(*) filter (where e.event_type = 'ad_viewable')::bigint as ad_viewable_events,
      count(*) filter (where e.device_type = 'mobile')::bigint as mobile_events,
      count(*) filter (where e.device_type = 'desktop')::bigint as desktop_events
    from today_events e
  ),
  ad_rows as (
    select
      e.ad_slot,
      e.ad_unit,
      count(*) filter (where e.event_type = 'ad_viewable')::bigint as viewable_count,
      count(distinct e.session_id)::bigint as unique_sessions,
      max(e.created_at) as last_seen_at
    from today_events e
    where e.event_type = 'ad_viewable'
      and e.ad_slot is not null
    group by e.ad_slot, e.ad_unit
  ),
  page_rows as (
    select
      coalesce(e.page_view, 'unknown') as page_view,
      e.page_path,
      count(*)::bigint as view_count,
      count(distinct e.session_id)::bigint as unique_sessions,
      max(e.created_at) as last_seen_at
    from today_events e
    where e.event_type = 'page_view'
    group by coalesce(e.page_view, 'unknown'), e.page_path
  ),
  inquiry_rows as (
    select
      ni.id,
      ni.message,
      ni.contact,
      ni.page_url,
      ni.created_at
    from public.notice_inquiries ni
    order by ni.created_at desc
    limit 10
  )
  select
    coalesce(s.today_events, 0),
    coalesce(s.unique_sessions, 0),
    coalesce(s.page_views, 0),
    coalesce(s.ad_viewable_events, 0),
    coalesce(s.mobile_events, 0),
    coalesce(s.desktop_events, 0),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'ad_slot', ar.ad_slot,
          'ad_unit', ar.ad_unit,
          'viewable_count', ar.viewable_count,
          'unique_sessions', ar.unique_sessions,
          'last_seen_at', ar.last_seen_at
        )
        order by ar.viewable_count desc, ar.ad_slot
      )
      from ad_rows ar
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'page_view', pr.page_view,
          'page_path', pr.page_path,
          'view_count', pr.view_count,
          'unique_sessions', pr.unique_sessions,
          'last_seen_at', pr.last_seen_at
        )
        order by pr.view_count desc, pr.page_view
      )
      from page_rows pr
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', ir.id,
          'message', ir.message,
          'contact', ir.contact,
          'page_url', ir.page_url,
          'created_at', ir.created_at
        )
        order by ir.created_at desc
      )
      from inquiry_rows ir
    ), '[]'::jsonb)
  from summary s;
end;
$$;

grant execute on function public.log_revenue_event(
  text,
  text,
  text,
  text,
  text,
  integer,
  integer,
  text,
  text,
  integer,
  integer,
  jsonb
) to anon, authenticated;

grant execute on function public.admin_get_tool_usage_summary(uuid) to anon, authenticated;
