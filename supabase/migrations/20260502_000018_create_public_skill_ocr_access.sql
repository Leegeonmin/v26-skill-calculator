create table if not exists public.skill_ocr_public_weekly_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('hitter', 'pitcher')),
  week_start_date date not null,
  used_at timestamptz not null default now(),
  primary key (user_id, role, week_start_date)
);

create table if not exists public.skill_ocr_public_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('hitter', 'pitcher')),
  image_name text,
  request_id text,
  raw_response jsonb not null default '{}'::jsonb,
  selected_players jsonb not null default '[]'::jsonb,
  player_count integer not null default 0 check (player_count >= 0 and player_count <= 9),
  total_score numeric(10, 2) not null default 0,
  average_score numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_skill_ocr_public_uploads_user_created_at
  on public.skill_ocr_public_uploads (user_id, created_at desc);

create index if not exists idx_skill_ocr_public_uploads_role_created_at
  on public.skill_ocr_public_uploads (role, created_at desc);

drop trigger if exists trg_touch_skill_ocr_public_uploads_updated_at on public.skill_ocr_public_uploads;
create trigger trg_touch_skill_ocr_public_uploads_updated_at
before update on public.skill_ocr_public_uploads
for each row
execute procedure public.touch_skill_ocr_updated_at();

revoke all on public.skill_ocr_public_weekly_usage from anon, authenticated;
revoke all on public.skill_ocr_public_uploads from anon, authenticated;

create or replace function public.current_kst_week_start()
returns date
language sql
stable
as $$
  select date_trunc('week', now() at time zone 'Asia/Seoul')::date;
$$;

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

create or replace function public.skill_ocr_save_public_upload(
  p_role text,
  p_image_name text,
  p_request_id text,
  p_raw_response jsonb,
  p_selected_players jsonb,
  p_total_score numeric,
  p_average_score numeric
)
returns table (
  id uuid,
  role text,
  image_name text,
  request_id text,
  raw_response jsonb,
  selected_players jsonb,
  player_count integer,
  total_score numeric,
  average_score numeric,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_player_count integer;
  v_upload public.skill_ocr_public_uploads;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_role not in ('hitter', 'pitcher') then
    raise exception 'INVALID_SKILL_OCR_ROLE';
  end if;

  v_player_count := case
    when jsonb_typeof(coalesce(p_selected_players, '[]'::jsonb)) = 'array'
      then jsonb_array_length(coalesce(p_selected_players, '[]'::jsonb))
    else 0
  end;

  if v_player_count > 9 then
    raise exception 'SKILL_OCR_PLAYER_LIMIT_EXCEEDED';
  end if;

  insert into public.skill_ocr_public_uploads (
    user_id,
    role,
    image_name,
    request_id,
    raw_response,
    selected_players,
    player_count,
    total_score,
    average_score
  ) values (
    v_user_id,
    p_role,
    nullif(p_image_name, ''),
    nullif(p_request_id, ''),
    coalesce(p_raw_response, '{}'::jsonb),
    coalesce(p_selected_players, '[]'::jsonb),
    v_player_count,
    coalesce(p_total_score, 0),
    coalesce(p_average_score, 0)
  )
  returning * into v_upload;

  return query
  select
    v_upload.id,
    v_upload.role,
    v_upload.image_name,
    v_upload.request_id,
    v_upload.raw_response,
    v_upload.selected_players,
    v_upload.player_count,
    v_upload.total_score,
    v_upload.average_score,
    v_upload.created_at,
    v_upload.updated_at;
end;
$$;

create or replace function public.skill_ocr_list_public_uploads(
  p_limit integer default 20
)
returns table (
  id uuid,
  role text,
  image_name text,
  request_id text,
  selected_players jsonb,
  player_count integer,
  total_score numeric,
  average_score numeric,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  return query
  select
    u.id,
    u.role,
    u.image_name,
    u.request_id,
    u.selected_players,
    u.player_count,
    u.total_score,
    u.average_score,
    u.created_at,
    u.updated_at
  from public.skill_ocr_public_uploads u
  where u.user_id = v_user_id
  order by u.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
end;
$$;

grant execute on function public.skill_ocr_get_public_weekly_quota() to authenticated;
grant execute on function public.skill_ocr_claim_public_weekly_usage(text) to authenticated;
grant execute on function public.skill_ocr_save_public_upload(text, text, text, jsonb, jsonb, numeric, numeric) to authenticated;
grant execute on function public.skill_ocr_list_public_uploads(integer) to authenticated;
