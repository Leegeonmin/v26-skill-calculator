drop function if exists public.admin_get_tool_usage_summary(uuid);

create or replace function public.admin_get_tool_usage_summary(
  p_session_token uuid
)
returns table (
  total_events bigint,
  today_events bigint,
  seven_day_events bigint,
  thirty_day_events bigint,
  unique_sessions bigint,
  avg_actions_per_session numeric,
  advanced_manual_rolls bigint,
  advanced_auto_runs bigint,
  impact_auto_runs bigint,
  hitter_events bigint,
  pitcher_events bigint,
  avg_rolls_to_s numeric,
  avg_rolls_to_ssr_plus numeric,
  ocr_total_requests bigint,
  ocr_lineup_requests bigint,
  ocr_public_lineup_requests bigint,
  ocr_private_lineup_requests bigint,
  ocr_skill_compare_requests bigint,
  ocr_hitter_requests bigint,
  ocr_pitcher_requests bigint,
  ocr_saved_uploads bigint,
  ocr_saved_hitter_uploads bigint,
  ocr_saved_pitcher_uploads bigint,
  ocr_public_snapshots bigint,
  ocr_public_saved_uploads bigint,
  ocr_public_pending_uploads bigint,
  ocr_public_saved_hitter_uploads bigint,
  ocr_public_saved_pitcher_uploads bigint,
  ocr_breakdown jsonb,
  tool_breakdown jsonb,
  recent_inquiries jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_events bigint;
  v_ocr_saved_uploads bigint;
  v_ocr_saved_hitter_uploads bigint;
  v_ocr_saved_pitcher_uploads bigint;
  v_ocr_public_snapshots bigint;
  v_ocr_public_saved_uploads bigint;
  v_ocr_public_pending_uploads bigint;
  v_ocr_public_saved_hitter_uploads bigint;
  v_ocr_public_saved_pitcher_uploads bigint;
begin
  if not exists (
    select 1
    from public.admin_sessions s
    where s.session_token = p_session_token
      and s.expires_at > now()
  ) then
    raise exception 'INVALID_ADMIN_SESSION';
  end if;

  select greatest(coalesce(c.reltuples, 0), 0)::bigint
  into v_total_events
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'tool_usage_events';

  select
    count(*)::bigint,
    count(*) filter (where u.role = 'hitter')::bigint,
    count(*) filter (where u.role = 'pitcher')::bigint
  into
    v_ocr_saved_uploads,
    v_ocr_saved_hitter_uploads,
    v_ocr_saved_pitcher_uploads
  from public.skill_ocr_uploads u;

  select
    count(*)::bigint,
    count(*) filter (where p.is_saved)::bigint,
    count(*) filter (where not p.is_saved)::bigint,
    count(*) filter (where p.is_saved and p.role = 'hitter')::bigint,
    count(*) filter (where p.is_saved and p.role = 'pitcher')::bigint
  into
    v_ocr_public_snapshots,
    v_ocr_public_saved_uploads,
    v_ocr_public_pending_uploads,
    v_ocr_public_saved_hitter_uploads,
    v_ocr_public_saved_pitcher_uploads
  from public.skill_ocr_public_uploads p;

  return query
  with latest_events as (
    select
      e.tool,
      e.mode,
      e.target_grade,
      e.roll_count,
      e.metadata,
      e.created_at,
      nullif(e.metadata->>'session_id', '') as event_session_id
    from public.tool_usage_events e
    order by e.created_at desc
    limit 5000
  ),
  summary as (
    select
      count(*) filter (where le.created_at >= date_trunc('day', now()))::bigint as today_events,
      count(*) filter (where le.created_at >= now() - interval '7 days')::bigint as seven_day_events,
      count(*) filter (where le.created_at >= now() - interval '30 days')::bigint as thirty_day_events,
      count(distinct le.event_session_id)::bigint as unique_sessions,
      count(*) filter (where le.tool = 'advanced_manual_roll')::bigint as advanced_manual_rolls,
      count(*) filter (where le.tool = 'advanced_auto_roll')::bigint as advanced_auto_runs,
      count(*) filter (where le.tool = 'impact_auto_roll')::bigint as impact_auto_runs,
      count(*) filter (where le.mode = 'hitter')::bigint as hitter_events,
      count(*) filter (where le.mode in ('starter', 'middle', 'closer'))::bigint as pitcher_events,
      round(avg(le.roll_count) filter (
        where le.tool = 'advanced_auto_roll' and le.target_grade = 'S'
      )::numeric, 2) as avg_rolls_to_s,
      round(avg(le.roll_count) filter (
        where le.tool = 'advanced_auto_roll' and le.target_grade = 'SSR+'
      )::numeric, 2) as avg_rolls_to_ssr_plus,
      count(*) filter (
        where le.tool in ('ocr_lineup_recognize', 'ocr_skill_compare_recognize')
      )::bigint as ocr_total_requests,
      count(*) filter (where le.tool = 'ocr_lineup_recognize')::bigint as ocr_lineup_requests,
      count(*) filter (
        where le.tool = 'ocr_lineup_recognize'
          and le.metadata->>'access' = 'public'
      )::bigint as ocr_public_lineup_requests,
      count(*) filter (
        where le.tool = 'ocr_lineup_recognize'
          and coalesce(le.metadata->>'access', 'private') <> 'public'
      )::bigint as ocr_private_lineup_requests,
      count(*) filter (where le.tool = 'ocr_skill_compare_recognize')::bigint as ocr_skill_compare_requests,
      count(*) filter (where le.tool = 'ocr_lineup_recognize' and le.mode = 'hitter')::bigint as ocr_hitter_requests,
      count(*) filter (where le.tool = 'ocr_lineup_recognize' and le.mode = 'pitcher')::bigint as ocr_pitcher_requests
    from latest_events le
  ),
  session_counts as (
    select
      le.event_session_id,
      count(*)::numeric as action_count
    from latest_events le
    where le.tool <> 'tool_view'
      and le.event_session_id is not null
    group by le.event_session_id
  ),
  tool_counts as (
    select
      le.tool,
      count(*)::bigint as event_count,
      count(distinct le.event_session_id)::bigint as unique_session_count,
      max(le.created_at) as last_seen_at
    from latest_events le
    group by le.tool
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
    coalesce(v_total_events, 0),
    coalesce(s.today_events, 0),
    coalesce(s.seven_day_events, 0),
    coalesce(s.thirty_day_events, 0),
    coalesce(s.unique_sessions, 0),
    (select round(avg(sc.action_count)::numeric, 2) from session_counts sc),
    coalesce(s.advanced_manual_rolls, 0),
    coalesce(s.advanced_auto_runs, 0),
    coalesce(s.impact_auto_runs, 0),
    coalesce(s.hitter_events, 0),
    coalesce(s.pitcher_events, 0),
    s.avg_rolls_to_s,
    s.avg_rolls_to_ssr_plus,
    coalesce(s.ocr_total_requests, 0),
    coalesce(s.ocr_lineup_requests, 0),
    coalesce(s.ocr_public_lineup_requests, 0),
    coalesce(s.ocr_private_lineup_requests, 0),
    coalesce(s.ocr_skill_compare_requests, 0),
    coalesce(s.ocr_hitter_requests, 0),
    coalesce(s.ocr_pitcher_requests, 0),
    coalesce(v_ocr_saved_uploads, 0),
    coalesce(v_ocr_saved_hitter_uploads, 0),
    coalesce(v_ocr_saved_pitcher_uploads, 0),
    coalesce(v_ocr_public_snapshots, 0),
    coalesce(v_ocr_public_saved_uploads, 0),
    coalesce(v_ocr_public_pending_uploads, 0),
    coalesce(v_ocr_public_saved_hitter_uploads, 0),
    coalesce(v_ocr_public_saved_pitcher_uploads, 0),
    jsonb_build_array(
      jsonb_build_object(
        'label', '공개 라인업 OCR - 투수',
        'request_count', coalesce((
          select count(*)::bigint
          from latest_events le
          where le.tool = 'ocr_lineup_recognize'
            and le.mode = 'pitcher'
            and le.metadata->>'access' = 'public'
        ), 0),
        'unique_sessions', coalesce((
          select count(distinct le.event_session_id)::bigint
          from latest_events le
          where le.tool = 'ocr_lineup_recognize'
            and le.mode = 'pitcher'
            and le.metadata->>'access' = 'public'
        ), 0),
        'saved_count', coalesce(v_ocr_public_saved_pitcher_uploads, 0),
        'last_seen_at', (
          select max(le.created_at)
          from latest_events le
          where le.tool = 'ocr_lineup_recognize'
            and le.mode = 'pitcher'
            and le.metadata->>'access' = 'public'
        )
      ),
      jsonb_build_object(
        'label', '공개 라인업 OCR - 타자',
        'request_count', coalesce((
          select count(*)::bigint
          from latest_events le
          where le.tool = 'ocr_lineup_recognize'
            and le.mode = 'hitter'
            and le.metadata->>'access' = 'public'
        ), 0),
        'unique_sessions', coalesce((
          select count(distinct le.event_session_id)::bigint
          from latest_events le
          where le.tool = 'ocr_lineup_recognize'
            and le.mode = 'hitter'
            and le.metadata->>'access' = 'public'
        ), 0),
        'saved_count', coalesce(v_ocr_public_saved_hitter_uploads, 0),
        'last_seen_at', (
          select max(le.created_at)
          from latest_events le
          where le.tool = 'ocr_lineup_recognize'
            and le.mode = 'hitter'
            and le.metadata->>'access' = 'public'
        )
      ),
      jsonb_build_object(
        'label', 'tyrant 라인업 OCR - 투수',
        'request_count', coalesce((
          select count(*)::bigint
          from latest_events le
          where le.tool = 'ocr_lineup_recognize'
            and le.mode = 'pitcher'
            and coalesce(le.metadata->>'access', 'private') <> 'public'
        ), 0),
        'unique_sessions', coalesce((
          select count(distinct le.event_session_id)::bigint
          from latest_events le
          where le.tool = 'ocr_lineup_recognize'
            and le.mode = 'pitcher'
            and coalesce(le.metadata->>'access', 'private') <> 'public'
        ), 0),
        'saved_count', coalesce(v_ocr_saved_pitcher_uploads, 0),
        'last_seen_at', (
          select max(le.created_at)
          from latest_events le
          where le.tool = 'ocr_lineup_recognize'
            and le.mode = 'pitcher'
            and coalesce(le.metadata->>'access', 'private') <> 'public'
        )
      ),
      jsonb_build_object(
        'label', 'tyrant 라인업 OCR - 타자',
        'request_count', coalesce((
          select count(*)::bigint
          from latest_events le
          where le.tool = 'ocr_lineup_recognize'
            and le.mode = 'hitter'
            and coalesce(le.metadata->>'access', 'private') <> 'public'
        ), 0),
        'unique_sessions', coalesce((
          select count(distinct le.event_session_id)::bigint
          from latest_events le
          where le.tool = 'ocr_lineup_recognize'
            and le.mode = 'hitter'
            and coalesce(le.metadata->>'access', 'private') <> 'public'
        ), 0),
        'saved_count', coalesce(v_ocr_saved_hitter_uploads, 0),
        'last_seen_at', (
          select max(le.created_at)
          from latest_events le
          where le.tool = 'ocr_lineup_recognize'
            and le.mode = 'hitter'
            and coalesce(le.metadata->>'access', 'private') <> 'public'
        )
      ),
      jsonb_build_object(
        'label', '스킬 비교 OCR',
        'request_count', coalesce(s.ocr_skill_compare_requests, 0),
        'unique_sessions', coalesce((
          select count(distinct le.event_session_id)::bigint
          from latest_events le
          where le.tool = 'ocr_skill_compare_recognize'
        ), 0),
        'saved_count', 0,
        'last_seen_at', (
          select max(le.created_at)
          from latest_events le
          where le.tool = 'ocr_skill_compare_recognize'
        )
      )
    ),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'tool', tc.tool,
          'event_count', tc.event_count,
          'unique_sessions', tc.unique_session_count,
          'last_seen_at', tc.last_seen_at
        )
        order by tc.event_count desc, tc.tool
      )
      from tool_counts tc
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

grant execute on function public.admin_get_tool_usage_summary(uuid) to anon, authenticated;
