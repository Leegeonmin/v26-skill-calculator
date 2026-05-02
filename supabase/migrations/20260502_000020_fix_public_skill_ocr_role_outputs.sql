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
    quota_rows.quota_role as role,
    quota_rows.quota_used as used,
    quota_rows.quota_used_at as used_at,
    quota_rows.quota_week_start_date as week_start_date
  from (
    select
      role_options.quota_role,
      (usage_row.used_at is not null) as quota_used,
      usage_row.used_at as quota_used_at,
      v_week_start as quota_week_start_date
    from (values ('hitter'::text), ('pitcher'::text)) as role_options(quota_role)
    left join public.skill_ocr_public_weekly_usage usage_row
      on usage_row.user_id = v_user_id
     and usage_row.role = role_options.quota_role
     and usage_row.week_start_date = v_week_start
  ) quota_rows
  order by quota_rows.quota_role;
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
  v_inserted_count integer;
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

  get diagnostics v_inserted_count = row_count;

  if v_inserted_count = 0 then
    raise exception 'PUBLIC_SKILL_OCR_WEEKLY_LIMIT_REACHED';
  end if;

  return query
  select
    quota_rows.role,
    quota_rows.used,
    quota_rows.used_at,
    quota_rows.week_start_date
  from public.skill_ocr_get_public_weekly_quota() as quota_rows(
    role,
    used,
    used_at,
    week_start_date
  );
end;
$$;

grant execute on function public.skill_ocr_get_public_weekly_quota() to authenticated;
grant execute on function public.skill_ocr_claim_public_weekly_usage(text) to authenticated;
