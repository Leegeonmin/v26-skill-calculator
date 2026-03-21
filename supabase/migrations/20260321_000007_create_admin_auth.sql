create extension if not exists pgcrypto;

create table if not exists public.admin_accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_sessions (
  session_token uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.admin_accounts (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_sessions_account_id on public.admin_sessions (account_id);
create index if not exists idx_admin_sessions_expires_at on public.admin_sessions (expires_at);

create or replace function public.touch_admin_accounts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_admin_accounts_updated_at on public.admin_accounts;
create trigger trg_touch_admin_accounts_updated_at
before update on public.admin_accounts
for each row
execute procedure public.touch_admin_accounts_updated_at();

create or replace function public.admin_login(
  p_username text,
  p_password text
)
returns table (
  session_token uuid,
  username text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.admin_accounts;
  v_session public.admin_sessions;
begin
  select *
  into v_account
  from public.admin_accounts
  where public.admin_accounts.username = p_username
    and is_active = true
  limit 1;

  if v_account.id is null or v_account.password_hash <> crypt(p_password, v_account.password_hash) then
    raise exception 'INVALID_ADMIN_CREDENTIALS';
  end if;

  delete from public.admin_sessions
  where account_id = v_account.id
     or expires_at <= now();

  insert into public.admin_sessions (
    account_id,
    expires_at
  ) values (
    v_account.id,
    now() + interval '12 hours'
  )
  returning * into v_session;

  return query
  select v_session.session_token, v_account.username, v_session.expires_at;
end;
$$;

create or replace function public.admin_validate_session(
  p_session_token uuid
)
returns table (
  session_token uuid,
  username text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.admin_sessions
  where expires_at <= now();

  return query
  select s.session_token, a.username, s.expires_at
  from public.admin_sessions s
  join public.admin_accounts a on a.id = s.account_id
  where s.session_token = p_session_token
    and s.expires_at > now()
    and a.is_active = true
  limit 1;
end;
$$;

create or replace function public.admin_logout(
  p_session_token uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.admin_sessions
  where session_token = p_session_token;
end;
$$;

revoke all on public.admin_accounts from anon, authenticated;
revoke all on public.admin_sessions from anon, authenticated;

grant execute on function public.admin_login(text, text) to anon, authenticated;
grant execute on function public.admin_validate_session(uuid) to anon, authenticated;
grant execute on function public.admin_logout(uuid) to anon, authenticated;
