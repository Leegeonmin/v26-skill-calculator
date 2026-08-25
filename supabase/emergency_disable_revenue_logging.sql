-- Emergency mitigation for Supabase Nano DB Disk I/O saturation.
-- Run this first in Supabase SQL Editor if login/auth/RPC calls are timing out.
-- This only disables new writes. Avoid TRUNCATE while the database is saturated.

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
  -- Intentionally no-op while the project is on a small/free compute tier.
  return;
end;
$$;
