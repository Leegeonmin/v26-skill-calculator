create or replace function public.skill_ocr_get_public_weekly_quota()
returns table (
  role text,
  used boolean,
  used_at timestamptz,
  week_start_date date
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_week_start date := public.current_kst_week_start();
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  return query
  select
    role_rows.quota_role,
    (usage.used_at is not null) as used,
    usage.used_at,
    v_week_start
  from (values ('hitter'::text), ('pitcher'::text)) as role_rows(quota_role)
  left join public.skill_ocr_public_weekly_usage usage
    on usage.user_id = v_user_id
   and usage.role = role_rows.quota_role
   and usage.week_start_date = v_week_start
  order by role_rows.quota_role;
end;
$$;

create or replace function public.skill_ocr_claim_public_weekly_usage(
  p_role text
)
returns table (
  role text,
  used boolean,
  used_at timestamptz,
  week_start_date date
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_week_start date := public.current_kst_week_start();
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_role not in ('hitter', 'pitcher') then
    raise exception 'INVALID_SKILL_OCR_ROLE';
  end if;

  insert into public.skill_ocr_public_weekly_usage (
    user_id,
    role,
    week_start_date,
    used_at
  ) values (
    v_user_id,
    p_role,
    v_week_start,
    now()
  )
  on conflict (user_id, role, week_start_date) do nothing;

  if not found then
    raise exception 'PUBLIC_SKILL_OCR_WEEKLY_LIMIT_REACHED';
  end if;

  return query
  select
    quota.role,
    quota.used,
    quota.used_at,
    quota.week_start_date
  from public.skill_ocr_get_public_weekly_quota() quota;
end;
$$;

grant execute on function public.skill_ocr_get_public_weekly_quota() to authenticated;
grant execute on function public.skill_ocr_claim_public_weekly_usage(text) to authenticated;
