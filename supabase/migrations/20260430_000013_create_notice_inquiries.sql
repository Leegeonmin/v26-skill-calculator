create table if not exists public.notice_inquiries (
  id uuid primary key default gen_random_uuid(),
  message text not null check (char_length(trim(message)) between 1 and 2000),
  contact text,
  page_url text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_notice_inquiries_created_at
  on public.notice_inquiries (created_at desc);

create or replace function public.submit_notice_inquiry(
  p_message text,
  p_contact text default null,
  p_page_url text default null,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_message is null or char_length(trim(p_message)) = 0 then
    raise exception 'EMPTY_MESSAGE';
  end if;

  insert into public.notice_inquiries (
    message,
    contact,
    page_url,
    user_agent
  ) values (
    trim(p_message),
    nullif(trim(coalesce(p_contact, '')), ''),
    nullif(trim(coalesce(p_page_url, '')), ''),
    nullif(trim(coalesce(p_user_agent, '')), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on public.notice_inquiries from anon, authenticated;

grant execute on function public.submit_notice_inquiry(text, text, text, text)
  to anon, authenticated;
