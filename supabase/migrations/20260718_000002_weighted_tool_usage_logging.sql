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
  v_event_weight integer := 1;
  v_ocr_kind text;
  v_inserted_count integer;
begin
  if coalesce(p_metadata, '{}'::jsonb)->>'sample_weight' ~ '^[0-9]+$' then
    v_event_weight := greatest(((coalesce(p_metadata, '{}'::jsonb)->>'sample_weight')::integer), 1);
  end if;

  if p_tool <> 'tool_view' then
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
  end if;

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
    v_event_weight,
    case when p_tool = 'advanced_manual_roll' then v_event_weight else 0 end,
    case when p_tool = 'advanced_auto_roll' then v_event_weight else 0 end,
    case when p_tool = 'impact_auto_roll' then v_event_weight else 0 end,
    case when p_mode = 'hitter' then v_event_weight else 0 end,
    case when p_mode in ('starter', 'middle', 'closer', 'pitcher') then v_event_weight else 0 end,
    case when p_tool = 'advanced_auto_roll' and p_target_grade = 'S' then v_roll_count * v_event_weight else 0 end,
    case when p_tool = 'advanced_auto_roll' and p_target_grade = 'S' then v_event_weight else 0 end,
    case when p_tool = 'advanced_auto_roll' and p_target_grade = 'SSR+' then v_roll_count * v_event_weight else 0 end,
    case when p_tool = 'advanced_auto_roll' and p_target_grade = 'SSR+' then v_event_weight else 0 end,
    case when v_ocr_kind is not null then v_event_weight else 0 end,
    case when p_tool = 'ocr_lineup_recognize' then v_event_weight else 0 end,
    case when p_tool = 'ocr_skill_compare_recognize' then v_event_weight else 0 end,
    case when p_tool = 'ocr_lineup_recognize' and p_mode = 'hitter' then v_event_weight else 0 end,
    case when p_tool = 'ocr_lineup_recognize' and p_mode = 'pitcher' then v_event_weight else 0 end,
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
    v_event_weight,
    v_created_at
  )
  on conflict (metric_date, tool) do update set
    event_count = public.admin_daily_tool_summary.event_count + excluded.event_count,
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
      v_event_weight,
      v_created_at
    )
    on conflict (metric_date, ocr_kind) do update set
      request_count = public.admin_daily_ocr_summary.request_count + excluded.request_count,
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

grant execute on function public.log_tool_usage_event(text, text, text, text, integer, numeric, text, jsonb) to anon, authenticated;
