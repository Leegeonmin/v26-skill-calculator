create table if not exists public.tool_usage_events (
  id uuid primary key default gen_random_uuid(),
  tool text not null,
  mode text,
  card_type text,
  target_grade text,
  roll_count integer not null default 1 check (roll_count > 0),
  result_score numeric(10, 2),
  result_grade text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_tool_usage_events_created_at
  on public.tool_usage_events (created_at desc);

create index if not exists idx_tool_usage_events_tool
  on public.tool_usage_events (tool, created_at desc);

create index if not exists idx_tool_usage_events_mode
  on public.tool_usage_events (mode, created_at desc);

create or replace function public.log_tool_usage_event(
  p_tool text,
  p_mode text default null,
  p_card_type text default null,
  p_target_grade text default null,
  p_roll_count integer default 1,
  p_result_score numeric default null,
  p_result_grade text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tool_usage_events (
    tool,
    mode,
    card_type,
    target_grade,
    roll_count,
    result_score,
    result_grade,
    metadata
  ) values (
    p_tool,
    p_mode,
    p_card_type,
    p_target_grade,
    greatest(coalesce(p_roll_count, 1), 1),
    p_result_score,
    p_result_grade,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function public.admin_get_tool_usage_summary(
  p_session_token uuid
)
returns table (
  total_events bigint,
  unique_sessions bigint,
  avg_actions_per_session numeric,
  advanced_manual_rolls bigint,
  advanced_auto_runs bigint,
  impact_auto_runs bigint,
  hitter_events bigint,
  pitcher_events bigint,
  avg_rolls_to_s numeric,
  avg_rolls_to_ssr_plus numeric
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
    )::numeric, 2) as avg_rolls_to_ssr_plus
  from public.tool_usage_events e;
end;
$$;

revoke all on public.tool_usage_events from anon, authenticated;

grant execute on function public.log_tool_usage_event(
  text,
  text,
  text,
  text,
  integer,
  numeric,
  text,
  jsonb
) to anon, authenticated;

grant execute on function public.admin_get_tool_usage_summary(uuid) to anon, authenticated;
