create table if not exists public.daily_roll_pending (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.season_entries (id) on delete cascade,
  roll_date_kst date not null,
  before_skills jsonb not null,
  before_score numeric not null,
  rolled_skills jsonb not null,
  rolled_score numeric not null,
  created_at timestamptz not null default now(),
  unique (entry_id, roll_date_kst)
);

create index if not exists idx_daily_roll_pending_entry_date
  on public.daily_roll_pending (entry_id, roll_date_kst);

alter table public.daily_roll_pending enable row level security;

create policy "daily_roll_pending_select_own"
  on public.daily_roll_pending
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.season_entries se
      where se.id = entry_id
        and se.user_id = auth.uid()
    )
  );

create or replace function public.get_pending_daily_rank_roll(
  p_entry_id uuid
)
returns public.daily_roll_pending
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_pending public.daily_roll_pending;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select p.*
  into v_pending
  from public.daily_roll_pending p
  join public.season_entries se on se.id = p.entry_id
  where p.entry_id = p_entry_id
    and p.roll_date_kst = public.current_kst_date()
    and se.user_id = v_user_id
  limit 1;

  return v_pending;
end;
$$;

create or replace function public.create_pending_daily_rank_roll(
  p_entry_id uuid,
  p_before_skills jsonb,
  p_before_score numeric,
  p_rolled_skills jsonb,
  p_rolled_score numeric
)
returns public.daily_roll_pending
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_entry public.season_entries;
  v_roll_date_kst date := public.current_kst_date();
  v_pending public.daily_roll_pending;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select *
  into v_entry
  from public.season_entries
  where id = p_entry_id
    and user_id = v_user_id;

  if v_entry.id is null then
    raise exception 'ENTRY_NOT_FOUND';
  end if;

  if exists (
    select 1
    from public.daily_roll_logs
    where entry_id = p_entry_id
      and roll_date_kst = v_roll_date_kst
  ) then
    raise exception 'DAILY_ROLL_ALREADY_USED';
  end if;

  insert into public.daily_roll_pending (
    entry_id,
    roll_date_kst,
    before_skills,
    before_score,
    rolled_skills,
    rolled_score
  ) values (
    p_entry_id,
    v_roll_date_kst,
    p_before_skills,
    p_before_score,
    p_rolled_skills,
    p_rolled_score
  )
  returning * into v_pending;

  return v_pending;
exception
  when unique_violation then
    raise exception 'DAILY_ROLL_PENDING_EXISTS';
end;
$$;

create or replace function public.resolve_pending_daily_rank_roll(
  p_entry_id uuid,
  p_selected_result text
)
returns public.season_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_entry public.season_entries;
  v_pending public.daily_roll_pending;
  v_final_skills jsonb;
  v_final_score numeric;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_selected_result not in ('keep', 'replace') then
    raise exception 'INVALID_SELECTION';
  end if;

  select *
  into v_entry
  from public.season_entries
  where id = p_entry_id
    and user_id = v_user_id;

  if v_entry.id is null then
    raise exception 'ENTRY_NOT_FOUND';
  end if;

  select *
  into v_pending
  from public.daily_roll_pending
  where entry_id = p_entry_id
    and roll_date_kst = public.current_kst_date()
  limit 1;

  if v_pending.id is null then
    raise exception 'PENDING_ROLL_NOT_FOUND';
  end if;

  if p_selected_result = 'replace' then
    v_final_skills := v_pending.rolled_skills;
    v_final_score := v_pending.rolled_score;
  else
    v_final_skills := v_pending.before_skills;
    v_final_score := v_pending.before_score;
  end if;

  insert into public.daily_roll_logs (
    entry_id,
    roll_date_kst,
    before_skills,
    rolled_skills,
    selected_result,
    final_skills,
    final_score
  ) values (
    p_entry_id,
    v_pending.roll_date_kst,
    v_pending.before_skills,
    v_pending.rolled_skills,
    p_selected_result,
    v_final_skills,
    v_final_score
  );

  update public.season_entries
  set current_skills = v_final_skills,
      current_score = v_final_score,
      score_reached_at = case
        when v_final_score > current_score then now()
        else score_reached_at
      end,
      updated_at = now()
  where id = p_entry_id
  returning * into v_entry;

  delete from public.daily_roll_pending
  where id = v_pending.id;

  return v_entry;
exception
  when unique_violation then
    raise exception 'DAILY_ROLL_ALREADY_USED';
end;
$$;

grant execute on function public.get_pending_daily_rank_roll(uuid) to authenticated;
grant execute on function public.create_pending_daily_rank_roll(uuid, jsonb, numeric, jsonb, numeric) to authenticated;
grant execute on function public.resolve_pending_daily_rank_roll(uuid, text) to authenticated;
