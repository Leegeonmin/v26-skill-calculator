-- Keep only the latest saved lineup per Google user and role.
-- The current lineup feature stores manual/server records in skill_ocr_public_uploads.
with ranked_public_lineups as (
  select
    id,
    row_number() over (
      partition by user_id, role
      order by updated_at desc, created_at desc
    ) as row_rank
  from public.skill_ocr_public_uploads
  where is_saved = true
)
delete from public.skill_ocr_public_uploads upload_row
using ranked_public_lineups ranked
where upload_row.id = ranked.id
  and ranked.row_rank > 1;

-- Remove old unfinalized OCR snapshots. Manual guest records are browser-only and are not stored here.
delete from public.skill_ocr_public_uploads
where is_saved = false;

-- Old public OCR weekly quota is no longer used by the manual lineup flow.
drop function if exists public.skill_ocr_get_public_weekly_quota();
drop function if exists public.skill_ocr_claim_public_weekly_usage(text);

drop table if exists public.skill_ocr_public_weekly_usage;

-- Legacy password-protected /tyrant OCR storage and session objects.
drop function if exists public.skill_ocr_login(text, text);
drop function if exists public.skill_ocr_validate_session(uuid);
drop function if exists public.skill_ocr_logout(uuid);
drop function if exists public.skill_ocr_save_upload(uuid, text, text, text, jsonb, jsonb, numeric, numeric);
drop function if exists public.skill_ocr_list_uploads(uuid, integer);
drop function if exists public.skill_ocr_get_upload(uuid, uuid);
drop function if exists public.get_skill_ocr_account_id(uuid);

drop table if exists public.skill_ocr_sessions;
drop table if exists public.skill_ocr_uploads;
drop table if exists public.skill_ocr_accounts;

-- Legacy tool usage logging was replaced by revenue_events/log_revenue_event.
drop function if exists public.log_tool_usage_event(text, text, text, text, integer, numeric, text, jsonb);
drop function if exists public.cleanup_tool_usage_events(integer);

drop table if exists public.admin_daily_ocr_sessions;
drop table if exists public.admin_daily_ocr_summary;
drop table if exists public.admin_daily_tool_sessions;
drop table if exists public.admin_daily_tool_summary;
drop table if exists public.admin_daily_usage_sessions;
drop table if exists public.admin_daily_usage_summary;
drop table if exists public.tool_usage_events;
