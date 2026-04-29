create extension if not exists pgcrypto;

create table if not exists public.skill_ocr_accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password text not null,
  display_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.skill_ocr_sessions (
  session_token uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.skill_ocr_accounts (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.skill_ocr_uploads (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.skill_ocr_accounts (id) on delete cascade,
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

create index if not exists idx_skill_ocr_sessions_account_id
  on public.skill_ocr_sessions (account_id);

create index if not exists idx_skill_ocr_sessions_expires_at
  on public.skill_ocr_sessions (expires_at);

create index if not exists idx_skill_ocr_uploads_account_created_at
  on public.skill_ocr_uploads (account_id, created_at desc);

create index if not exists idx_skill_ocr_uploads_role_created_at
  on public.skill_ocr_uploads (role, created_at desc);

create or replace function public.touch_skill_ocr_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_skill_ocr_accounts_updated_at on public.skill_ocr_accounts;
create trigger trg_touch_skill_ocr_accounts_updated_at
before update on public.skill_ocr_accounts
for each row
execute procedure public.touch_skill_ocr_updated_at();

drop trigger if exists trg_touch_skill_ocr_uploads_updated_at on public.skill_ocr_uploads;
create trigger trg_touch_skill_ocr_uploads_updated_at
before update on public.skill_ocr_uploads
for each row
execute procedure public.touch_skill_ocr_updated_at();

create or replace function public.get_skill_ocr_account_id(
  p_session_token uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
begin
  delete from public.skill_ocr_sessions
  where public.skill_ocr_sessions.expires_at <= now();

  select s.account_id
  into v_account_id
  from public.skill_ocr_sessions s
  join public.skill_ocr_accounts a on a.id = s.account_id
  where s.session_token = p_session_token
    and s.expires_at > now()
    and a.is_active = true
  limit 1;

  if v_account_id is null then
    raise exception 'INVALID_SKILL_OCR_SESSION';
  end if;

  return v_account_id;
end;
$$;

create or replace function public.skill_ocr_login(
  p_username text,
  p_password text
)
returns table (
  session_token uuid,
  username text,
  display_name text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.skill_ocr_accounts;
  v_session public.skill_ocr_sessions;
begin
  select *
  into v_account
  from public.skill_ocr_accounts
  where public.skill_ocr_accounts.username = p_username
    and is_active = true
  limit 1;

  if v_account.id is null or v_account.password <> p_password then
    raise exception 'INVALID_SKILL_OCR_CREDENTIALS';
  end if;

  delete from public.skill_ocr_sessions
  where public.skill_ocr_sessions.account_id = v_account.id
     or public.skill_ocr_sessions.expires_at <= now();

  insert into public.skill_ocr_sessions (
    account_id,
    expires_at
  ) values (
    v_account.id,
    now() + interval '14 days'
  )
  returning * into v_session;

  return query
  select
    v_session.session_token,
    v_account.username,
    v_account.display_name,
    v_session.expires_at;
end;
$$;

create or replace function public.skill_ocr_validate_session(
  p_session_token uuid
)
returns table (
  session_token uuid,
  username text,
  display_name text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.skill_ocr_sessions
  where public.skill_ocr_sessions.expires_at <= now();

  return query
  select s.session_token, a.username, a.display_name, s.expires_at
  from public.skill_ocr_sessions s
  join public.skill_ocr_accounts a on a.id = s.account_id
  where s.session_token = p_session_token
    and s.expires_at > now()
    and a.is_active = true
  limit 1;
end;
$$;

create or replace function public.skill_ocr_logout(
  p_session_token uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.skill_ocr_sessions
  where session_token = p_session_token;
end;
$$;

create or replace function public.skill_ocr_save_upload(
  p_session_token uuid,
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
  v_account_id uuid;
  v_player_count integer;
  v_upload public.skill_ocr_uploads;
begin
  if p_role not in ('hitter', 'pitcher') then
    raise exception 'INVALID_SKILL_OCR_ROLE';
  end if;

  v_account_id := public.get_skill_ocr_account_id(p_session_token);
  v_player_count := case
    when jsonb_typeof(coalesce(p_selected_players, '[]'::jsonb)) = 'array'
      then jsonb_array_length(coalesce(p_selected_players, '[]'::jsonb))
    else 0
  end;

  if v_player_count > 9 then
    raise exception 'SKILL_OCR_PLAYER_LIMIT_EXCEEDED';
  end if;

  insert into public.skill_ocr_uploads (
    account_id,
    role,
    image_name,
    request_id,
    raw_response,
    selected_players,
    player_count,
    total_score,
    average_score
  ) values (
    v_account_id,
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

create or replace function public.skill_ocr_list_uploads(
  p_session_token uuid,
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
  v_account_id uuid;
begin
  v_account_id := public.get_skill_ocr_account_id(p_session_token);

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
  from public.skill_ocr_uploads u
  where u.account_id = v_account_id
  order by u.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
end;
$$;

create or replace function public.skill_ocr_get_upload(
  p_session_token uuid,
  p_upload_id uuid
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
  v_account_id uuid;
begin
  v_account_id := public.get_skill_ocr_account_id(p_session_token);

  return query
  select
    u.id,
    u.role,
    u.image_name,
    u.request_id,
    u.raw_response,
    u.selected_players,
    u.player_count,
    u.total_score,
    u.average_score,
    u.created_at,
    u.updated_at
  from public.skill_ocr_uploads u
  where u.account_id = v_account_id
    and u.id = p_upload_id
  limit 1;
end;
$$;

revoke all on public.skill_ocr_accounts from anon, authenticated;
revoke all on public.skill_ocr_sessions from anon, authenticated;
revoke all on public.skill_ocr_uploads from anon, authenticated;

grant execute on function public.skill_ocr_login(text, text) to anon, authenticated;
grant execute on function public.skill_ocr_validate_session(uuid) to anon, authenticated;
grant execute on function public.skill_ocr_logout(uuid) to anon, authenticated;
grant execute on function public.skill_ocr_save_upload(uuid, text, text, text, jsonb, jsonb, numeric, numeric) to anon, authenticated;
grant execute on function public.skill_ocr_list_uploads(uuid, integer) to anon, authenticated;
grant execute on function public.skill_ocr_get_upload(uuid, uuid) to anon, authenticated;
