create table if not exists public.admin_daily_usage_summary (
  metric_date date primary key,
  total_events bigint not null default 0,
  unique_sessions bigint not null default 0,
  advanced_manual_rolls bigint not null default 0,
  advanced_auto_runs bigint not null default 0,
  impact_auto_runs bigint not null default 0,
  hitter_events bigint not null default 0,
  pitcher_events bigint not null default 0,
  advanced_auto_rolls_to_s_sum bigint not null default 0,
  advanced_auto_rolls_to_s_count bigint not null default 0,
  advanced_auto_rolls_to_ssr_plus_sum bigint not null default 0,
  advanced_auto_rolls_to_ssr_plus_count bigint not null default 0,
  ocr_total_requests bigint not null default 0,
  ocr_lineup_requests bigint not null default 0,
  ocr_skill_compare_requests bigint not null default 0,
  ocr_hitter_requests bigint not null default 0,
  ocr_pitcher_requests bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_daily_usage_sessions (
  metric_date date not null,
  session_id text not null,
  primary key (metric_date, session_id)
);

create table if not exists public.admin_daily_tool_summary (
  metric_date date not null,
  tool text not null,
  event_count bigint not null default 0,
  unique_sessions bigint not null default 0,
  last_seen_at timestamptz,
  primary key (metric_date, tool)
);

create table if not exists public.admin_daily_tool_sessions (
  metric_date date not null,
  tool text not null,
  session_id text not null,
  primary key (metric_date, tool, session_id)
);

create table if not exists public.admin_daily_ocr_summary (
  metric_date date not null,
  ocr_kind text not null check (ocr_kind in ('lineup_pitcher', 'lineup_hitter', 'skill_compare')),
  request_count bigint not null default 0,
  unique_sessions bigint not null default 0,
  last_seen_at timestamptz,
  primary key (metric_date, ocr_kind)
);

create table if not exists public.admin_daily_ocr_sessions (
  metric_date date not null,
  ocr_kind text not null,
  session_id text not null,
  primary key (metric_date, ocr_kind, session_id)
);

revoke all on public.admin_daily_usage_summary from anon, authenticated;
revoke all on public.admin_daily_usage_sessions from anon, authenticated;
revoke all on public.admin_daily_tool_summary from anon, authenticated;
revoke all on public.admin_daily_tool_sessions from anon, authenticated;
revoke all on public.admin_daily_ocr_summary from anon, authenticated;
revoke all on public.admin_daily_ocr_sessions from anon, authenticated;

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
declare
  v_metric_date date := (now() at time zone 'Asia/Seoul')::date;
  v_created_at timestamptz := now();
  v_session_id text := nullif(coalesce(p_metadata, '{}'::jsonb)->>'session_id', '');
  v_roll_count integer := greatest(coalesce(p_roll_count, 1), 1);
  v_ocr_kind text;
  v_inserted_count integer;
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
    v_roll_count,
    p_result_score,
    p_result_grade,
    coalesce(p_metadata, '{}'::jsonb)
  );

  if p_tool = 'ocr_lineup_recognize' and p_mode = 'pitcher' then
    v_ocr_kind := 'lineup_pitcher';
  elsif p_tool = 'ocr_lineup_recognize' and p_mode = 'hitter' then
    v_ocr_kind := 'lineup_hitter';
  elsif p_tool = 'ocr_skill_compare_recognize' then
    v_ocr_kind := 'skill_compare';
  end if;

  insert into public.admin_daily_usage_summary (
    metric_date,
    total_events,
    advanced_manual_rolls,
    advanced_auto_runs,
    impact_auto_runs,
    hitter_events,
    pitcher_events,
    advanced_auto_rolls_to_s_sum,
    advanced_auto_rolls_to_s_count,
    advanced_auto_rolls_to_ssr_plus_sum,
    advanced_auto_rolls_to_ssr_plus_count,
    ocr_total_requests,
    ocr_lineup_requests,
    ocr_skill_compare_requests,
    ocr_hitter_requests,
    ocr_pitcher_requests,
    updated_at
  ) values (
    v_metric_date,
    1,
    case when p_tool = 'advanced_manual_roll' then 1 else 0 end,
    case when p_tool = 'advanced_auto_roll' then 1 else 0 end,
    case when p_tool = 'impact_auto_roll' then 1 else 0 end,
    case when p_mode = 'hitter' then 1 else 0 end,
    case when p_mode in ('starter', 'middle', 'closer', 'pitcher') then 1 else 0 end,
    case when p_tool = 'advanced_auto_roll' and p_target_grade = 'S' then v_roll_count else 0 end,
    case when p_tool = 'advanced_auto_roll' and p_target_grade = 'S' then 1 else 0 end,
    case when p_tool = 'advanced_auto_roll' and p_target_grade = 'SSR+' then v_roll_count else 0 end,
    case when p_tool = 'advanced_auto_roll' and p_target_grade = 'SSR+' then 1 else 0 end,
    case when v_ocr_kind is not null then 1 else 0 end,
    case when p_tool = 'ocr_lineup_recognize' then 1 else 0 end,
    case when p_tool = 'ocr_skill_compare_recognize' then 1 else 0 end,
    case when p_tool = 'ocr_lineup_recognize' and p_mode = 'hitter' then 1 else 0 end,
    case when p_tool = 'ocr_lineup_recognize' and p_mode = 'pitcher' then 1 else 0 end,
    v_created_at
  )
  on conflict (metric_date) do update set
    total_events = public.admin_daily_usage_summary.total_events + excluded.total_events,
    advanced_manual_rolls = public.admin_daily_usage_summary.advanced_manual_rolls + excluded.advanced_manual_rolls,
    advanced_auto_runs = public.admin_daily_usage_summary.advanced_auto_runs + excluded.advanced_auto_runs,
    impact_auto_runs = public.admin_daily_usage_summary.impact_auto_runs + excluded.impact_auto_runs,
    hitter_events = public.admin_daily_usage_summary.hitter_events + excluded.hitter_events,
    pitcher_events = public.admin_daily_usage_summary.pitcher_events + excluded.pitcher_events,
    advanced_auto_rolls_to_s_sum = public.admin_daily_usage_summary.advanced_auto_rolls_to_s_sum + excluded.advanced_auto_rolls_to_s_sum,
    advanced_auto_rolls_to_s_count = public.admin_daily_usage_summary.advanced_auto_rolls_to_s_count + excluded.advanced_auto_rolls_to_s_count,
    advanced_auto_rolls_to_ssr_plus_sum = public.admin_daily_usage_summary.advanced_auto_rolls_to_ssr_plus_sum + excluded.advanced_auto_rolls_to_ssr_plus_sum,
    advanced_auto_rolls_to_ssr_plus_count = public.admin_daily_usage_summary.advanced_auto_rolls_to_ssr_plus_count + excluded.advanced_auto_rolls_to_ssr_plus_count,
    ocr_total_requests = public.admin_daily_usage_summary.ocr_total_requests + excluded.ocr_total_requests,
    ocr_lineup_requests = public.admin_daily_usage_summary.ocr_lineup_requests + excluded.ocr_lineup_requests,
    ocr_skill_compare_requests = public.admin_daily_usage_summary.ocr_skill_compare_requests + excluded.ocr_skill_compare_requests,
    ocr_hitter_requests = public.admin_daily_usage_summary.ocr_hitter_requests + excluded.ocr_hitter_requests,
    ocr_pitcher_requests = public.admin_daily_usage_summary.ocr_pitcher_requests + excluded.ocr_pitcher_requests,
    updated_at = excluded.updated_at;

  insert into public.admin_daily_tool_summary (
    metric_date,
    tool,
    event_count,
    last_seen_at
  ) values (
    v_metric_date,
    p_tool,
    1,
    v_created_at
  )
  on conflict (metric_date, tool) do update set
    event_count = public.admin_daily_tool_summary.event_count + 1,
    last_seen_at = excluded.last_seen_at;

  if v_session_id is not null then
    insert into public.admin_daily_usage_sessions (metric_date, session_id)
    values (v_metric_date, v_session_id)
    on conflict do nothing;
    get diagnostics v_inserted_count = row_count;

    if v_inserted_count > 0 then
      update public.admin_daily_usage_summary dus
      set unique_sessions = dus.unique_sessions + 1,
          updated_at = v_created_at
      where dus.metric_date = v_metric_date;
    end if;

    insert into public.admin_daily_tool_sessions (metric_date, tool, session_id)
    values (v_metric_date, p_tool, v_session_id)
    on conflict do nothing;
    get diagnostics v_inserted_count = row_count;

    if v_inserted_count > 0 then
      update public.admin_daily_tool_summary dts
      set unique_sessions = dts.unique_sessions + 1
      where dts.metric_date = v_metric_date
        and dts.tool = p_tool;
    end if;
  end if;

  if v_ocr_kind is not null then
    insert into public.admin_daily_ocr_summary (
      metric_date,
      ocr_kind,
      request_count,
      last_seen_at
    ) values (
      v_metric_date,
      v_ocr_kind,
      1,
      v_created_at
    )
    on conflict (metric_date, ocr_kind) do update set
      request_count = public.admin_daily_ocr_summary.request_count + 1,
      last_seen_at = excluded.last_seen_at;

    if v_session_id is not null then
      insert into public.admin_daily_ocr_sessions (metric_date, ocr_kind, session_id)
      values (v_metric_date, v_ocr_kind, v_session_id)
      on conflict do nothing;
      get diagnostics v_inserted_count = row_count;

      if v_inserted_count > 0 then
        update public.admin_daily_ocr_summary dos
        set unique_sessions = dos.unique_sessions + 1
        where dos.metric_date = v_metric_date
          and dos.ocr_kind = v_ocr_kind;
      end if;
    end if;
  end if;
end;
$$;

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
  ocr_skill_compare_requests bigint,
  ocr_hitter_requests bigint,
  ocr_pitcher_requests bigint,
  ocr_saved_uploads bigint,
  ocr_saved_hitter_uploads bigint,
  ocr_saved_pitcher_uploads bigint,
  ocr_breakdown jsonb,
  tool_breakdown jsonb,
  recent_inquiries jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_metric_date date := (now() at time zone 'Asia/Seoul')::date;
  v_ocr_saved_uploads bigint;
  v_ocr_saved_hitter_uploads bigint;
  v_ocr_saved_pitcher_uploads bigint;
begin
  if not exists (
    select 1
    from public.admin_sessions s
    where s.session_token = p_session_token
      and s.expires_at > now()
  ) then
    raise exception 'INVALID_ADMIN_SESSION';
  end if;

  select
    count(*)::bigint,
    count(*) filter (where u.role = 'hitter')::bigint,
    count(*) filter (where u.role = 'pitcher')::bigint
  into
    v_ocr_saved_uploads,
    v_ocr_saved_hitter_uploads,
    v_ocr_saved_pitcher_uploads
  from public.skill_ocr_uploads u;

  return query
  with current_summary as (
    select
      coalesce(d.total_events, 0)::bigint as today_events,
      coalesce(d.unique_sessions, 0)::bigint as unique_sessions,
      coalesce(d.advanced_manual_rolls, 0)::bigint as advanced_manual_rolls,
      coalesce(d.advanced_auto_runs, 0)::bigint as advanced_auto_runs,
      coalesce(d.impact_auto_runs, 0)::bigint as impact_auto_runs,
      coalesce(d.hitter_events, 0)::bigint as hitter_events,
      coalesce(d.pitcher_events, 0)::bigint as pitcher_events,
      case
        when coalesce(d.advanced_auto_rolls_to_s_count, 0) > 0 then
          round(d.advanced_auto_rolls_to_s_sum::numeric / d.advanced_auto_rolls_to_s_count, 2)
        else null
      end as avg_rolls_to_s,
      case
        when coalesce(d.advanced_auto_rolls_to_ssr_plus_count, 0) > 0 then
          round(d.advanced_auto_rolls_to_ssr_plus_sum::numeric / d.advanced_auto_rolls_to_ssr_plus_count, 2)
        else null
      end as avg_rolls_to_ssr_plus,
      coalesce(d.ocr_total_requests, 0)::bigint as ocr_total_requests,
      coalesce(d.ocr_lineup_requests, 0)::bigint as ocr_lineup_requests,
      coalesce(d.ocr_skill_compare_requests, 0)::bigint as ocr_skill_compare_requests,
      coalesce(d.ocr_hitter_requests, 0)::bigint as ocr_hitter_requests,
      coalesce(d.ocr_pitcher_requests, 0)::bigint as ocr_pitcher_requests
    from (select 1) seed
    left join public.admin_daily_usage_summary d on d.metric_date = v_metric_date
  ),
  tool_view_summary as (
    select coalesce(t.event_count, 0)::bigint as tool_view_events
    from (select 1) seed
    left join public.admin_daily_tool_summary t
      on t.metric_date = v_metric_date
     and t.tool = 'tool_view'
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
    cs.today_events,
    cs.today_events,
    0::bigint,
    0::bigint,
    cs.unique_sessions,
    case
      when cs.unique_sessions > 0 then
        round(greatest(cs.today_events - tv.tool_view_events, 0)::numeric / cs.unique_sessions, 2)
      else null
    end,
    cs.advanced_manual_rolls,
    cs.advanced_auto_runs,
    cs.impact_auto_runs,
    cs.hitter_events,
    cs.pitcher_events,
    cs.avg_rolls_to_s,
    cs.avg_rolls_to_ssr_plus,
    cs.ocr_total_requests,
    cs.ocr_lineup_requests,
    cs.ocr_skill_compare_requests,
    cs.ocr_hitter_requests,
    cs.ocr_pitcher_requests,
    coalesce(v_ocr_saved_uploads, 0),
    coalesce(v_ocr_saved_hitter_uploads, 0),
    coalesce(v_ocr_saved_pitcher_uploads, 0),
    jsonb_build_array(
      jsonb_build_object(
        'label', '라인업 OCR - 투수',
        'request_count', coalesce((select os.request_count from public.admin_daily_ocr_summary os where os.metric_date = v_metric_date and os.ocr_kind = 'lineup_pitcher'), 0),
        'unique_sessions', coalesce((select os.unique_sessions from public.admin_daily_ocr_summary os where os.metric_date = v_metric_date and os.ocr_kind = 'lineup_pitcher'), 0),
        'saved_count', coalesce(v_ocr_saved_pitcher_uploads, 0),
        'last_seen_at', (select os.last_seen_at from public.admin_daily_ocr_summary os where os.metric_date = v_metric_date and os.ocr_kind = 'lineup_pitcher')
      ),
      jsonb_build_object(
        'label', '라인업 OCR - 타자',
        'request_count', coalesce((select os.request_count from public.admin_daily_ocr_summary os where os.metric_date = v_metric_date and os.ocr_kind = 'lineup_hitter'), 0),
        'unique_sessions', coalesce((select os.unique_sessions from public.admin_daily_ocr_summary os where os.metric_date = v_metric_date and os.ocr_kind = 'lineup_hitter'), 0),
        'saved_count', coalesce(v_ocr_saved_hitter_uploads, 0),
        'last_seen_at', (select os.last_seen_at from public.admin_daily_ocr_summary os where os.metric_date = v_metric_date and os.ocr_kind = 'lineup_hitter')
      ),
      jsonb_build_object(
        'label', '스킬 비교 OCR',
        'request_count', coalesce((select os.request_count from public.admin_daily_ocr_summary os where os.metric_date = v_metric_date and os.ocr_kind = 'skill_compare'), 0),
        'unique_sessions', coalesce((select os.unique_sessions from public.admin_daily_ocr_summary os where os.metric_date = v_metric_date and os.ocr_kind = 'skill_compare'), 0),
        'saved_count', 0,
        'last_seen_at', (select os.last_seen_at from public.admin_daily_ocr_summary os where os.metric_date = v_metric_date and os.ocr_kind = 'skill_compare')
      )
    ),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'tool', ts.tool,
          'event_count', ts.event_count,
          'unique_sessions', ts.unique_sessions,
          'last_seen_at', ts.last_seen_at
        )
        order by ts.event_count desc, ts.tool
      )
      from public.admin_daily_tool_summary ts
      where ts.metric_date = v_metric_date
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
  from current_summary cs
  cross join tool_view_summary tv;
end;
$$;

grant execute on function public.log_tool_usage_event(text, text, text, text, integer, numeric, text, jsonb) to anon, authenticated;
grant execute on function public.admin_get_tool_usage_summary(uuid) to anon, authenticated;
