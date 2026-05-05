create table if not exists public.site_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

revoke all on public.site_settings from anon, authenticated;

create or replace function public.get_home_change_message()
returns table (
  message text,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    nullif(trim(s.value), '') as message,
    s.updated_at
  from public.site_settings s
  where s.key = 'home_change_message'
  limit 1;
$$;

create or replace function public.admin_get_home_change_message(
  p_session_token uuid
)
returns table (
  message text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
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
    coalesce(ss.value, '') as message,
    ss.updated_at
  from public.site_settings ss
  where ss.key = 'home_change_message'
  limit 1;
end;
$$;

create or replace function public.admin_update_home_change_message(
  p_session_token uuid,
  p_message text
)
returns table (
  message text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message text := left(coalesce(p_message, ''), 240);
begin
  if not exists (
    select 1
    from public.admin_sessions s
    where s.session_token = p_session_token
      and s.expires_at > now()
  ) then
    raise exception 'INVALID_ADMIN_SESSION';
  end if;

  insert into public.site_settings (key, value, updated_at)
  values ('home_change_message', v_message, now())
  on conflict (key) do update
    set value = excluded.value,
        updated_at = excluded.updated_at;

  return query
  select ss.value as message, ss.updated_at
  from public.site_settings ss
  where ss.key = 'home_change_message';
end;
$$;

grant execute on function public.get_home_change_message() to anon, authenticated;
grant execute on function public.admin_get_home_change_message(uuid) to anon, authenticated;
grant execute on function public.admin_update_home_change_message(uuid, text) to anon, authenticated;
