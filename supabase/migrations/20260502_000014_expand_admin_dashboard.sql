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
  advanced_auto_success_rate numeric,
  impact_success_rate numeric,
  tool_breakdown jsonb,
  recent_inquiries jsonb
)
language plpgsql
security definer
set search_path = public
as $$
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
  select
    count(*)::bigint as total_events,
    count(*) filter (where e.created_at >= date_trunc('day', now()))::bigint as today_events,
    count(*) filter (where e.created_at >= now() - interval '7 days')::bigint as seven_day_events,
    count(*) filter (where e.created_at >= now() - interval '30 days')::bigint as thirty_day_events,
    count(distinct nullif(e.metadata->>'session_id', ''))::bigint as unique_sessions,
    round((
      select avg(session_action_count)::numeric
      from (
        select
          nullif(s.metadata->>'session_id', '') as session_id,
          count(*)::numeric as session_action_count
        from public.tool_usage_events s
        where s.tool <> 'tool_view'
          and nullif(s.metadata->>'session_id', '') is not null
        group by nullif(s.metadata->>'session_id', '')
      ) session_counts
    ), 2) as avg_actions_per_session,
    count(*) filter (where e.tool = 'advanced_manual_roll')::bigint as advanced_manual_rolls,
    count(*) filter (where e.tool = 'advanced_auto_roll')::bigint as advanced_auto_runs,
    count(*) filter (where e.tool = 'impact_auto_roll')::bigint as impact_auto_runs,
    count(*) filter (where e.mode = 'hitter')::bigint as hitter_events,
    count(*) filter (where e.mode in ('starter', 'middle', 'closer'))::bigint as pitcher_events,
    round(avg(e.roll_count) filter (
      where e.tool = 'advanced_auto_roll' and e.target_grade = 'S'
    )::numeric, 2) as avg_rolls_to_s,
    round(avg(e.roll_count) filter (
      where e.tool = 'advanced_auto_roll' and e.target_grade = 'SSR+'
    )::numeric, 2) as avg_rolls_to_ssr_plus,
    round(
      100.0 * count(*) filter (
        where e.tool = 'advanced_auto_roll'
          and e.metadata->>'success' = 'true'
      ) / nullif(count(*) filter (where e.tool = 'advanced_auto_roll'), 0),
      1
    ) as advanced_auto_success_rate,
    round(
      100.0 * count(*) filter (
        where e.tool = 'impact_auto_roll'
          and e.metadata->>'success' = 'true'
      ) / nullif(count(*) filter (where e.tool = 'impact_auto_roll'), 0),
      1
    ) as impact_success_rate,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'tool', tool_counts.tool,
          'event_count', tool_counts.event_count,
          'unique_sessions', tool_counts.unique_sessions,
          'last_seen_at', tool_counts.last_seen_at
        )
        order by tool_counts.event_count desc, tool_counts.tool
      )
      from (
        select
          usage_by_tool.tool,
          count(*)::bigint as event_count,
          count(distinct nullif(usage_by_tool.metadata->>'session_id', ''))::bigint as unique_sessions,
          max(usage_by_tool.created_at) as last_seen_at
        from public.tool_usage_events usage_by_tool
        group by usage_by_tool.tool
      ) tool_counts
    ), '[]'::jsonb) as tool_breakdown,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', recent.id,
          'message', recent.message,
          'contact', recent.contact,
          'page_url', recent.page_url,
          'created_at', recent.created_at
        )
        order by recent.created_at desc
      )
      from (
        select
          id,
          message,
          contact,
          page_url,
          created_at
        from public.notice_inquiries
        order by created_at desc
        limit 10
      ) recent
    ), '[]'::jsonb) as recent_inquiries
  from public.tool_usage_events e;
end;
$$;

grant execute on function public.admin_get_tool_usage_summary(uuid) to anon, authenticated;
