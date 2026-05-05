create extension if not exists pgcrypto;

alter table public.skill_ocr_accounts
  add column if not exists password_hash text;

update public.skill_ocr_accounts
set password_hash = crypt(password, gen_salt('bf'))
where password_hash is null
  and password is not null;

alter table public.skill_ocr_accounts
  alter column password_hash set not null;

alter table public.skill_ocr_accounts
  drop column if exists password;

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

  if v_account.id is null or v_account.password_hash <> crypt(p_password, v_account.password_hash) then
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

grant execute on function public.skill_ocr_login(text, text) to anon, authenticated;
