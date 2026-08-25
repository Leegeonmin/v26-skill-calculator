create extension if not exists pgcrypto;

create table if not exists public.skill_quiz_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  season_key text not null,
  season_label text not null,
  rule_id text not null,
  role_label text not null,
  score integer not null check (score >= 0),
  correct_count integer not null check (correct_count >= 0 and correct_count <= 10),
  best_combo integer not null check (best_combo >= 0 and best_combo <= 10),
  average_ms numeric(10, 2) not null default 0 check (average_ms >= 0),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, season_key, rule_id)
);

create index if not exists idx_skill_quiz_scores_rank
  on public.skill_quiz_scores (season_key, rule_id, score desc, completed_at asc);

alter table public.skill_quiz_scores enable row level security;

drop policy if exists "skill_quiz_scores_select_own" on public.skill_quiz_scores;
create policy "skill_quiz_scores_select_own"
  on public.skill_quiz_scores
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.skill_quiz_mask_email(p_email text)
returns text
language sql
stable
as $$
  select case
    when p_email is null or split_part(p_email, '@', 1) = '' then 'unknown'
    when length(split_part(p_email, '@', 1)) <= 2 then left(split_part(p_email, '@', 1), 1) || '*'
    when length(split_part(p_email, '@', 1)) <= 4 then left(split_part(p_email, '@', 1), 2) || repeat('*', length(split_part(p_email, '@', 1)) - 2)
    else left(split_part(p_email, '@', 1), 3) || repeat('*', least(4, length(split_part(p_email, '@', 1)) - 3))
  end;
$$;

create or replace function public.submit_skill_quiz_score(
  p_season_key text,
  p_season_label text,
  p_rule_id text,
  p_role_label text,
  p_score integer,
  p_correct_count integer,
  p_best_combo integer,
  p_average_ms numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_saved public.skill_quiz_scores;
  v_rank integer;
  v_total integer;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if nullif(p_season_key, '') is null or nullif(p_rule_id, '') is null then
    raise exception 'INVALID_SEASON';
  end if;

  if p_score < 0
    or p_correct_count < 0
    or p_correct_count > 10
    or p_best_combo < 0
    or p_best_combo > 10
    or p_average_ms < 0 then
    raise exception 'INVALID_SCORE';
  end if;

  insert into public.skill_quiz_scores (
    user_id,
    season_key,
    season_label,
    rule_id,
    role_label,
    score,
    correct_count,
    best_combo,
    average_ms,
    completed_at
  ) values (
    v_user_id,
    p_season_key,
    coalesce(nullif(p_season_label, ''), p_season_key),
    p_rule_id,
    coalesce(nullif(p_role_label, ''), p_rule_id),
    p_score,
    p_correct_count,
    p_best_combo,
    p_average_ms,
    now()
  )
  on conflict (user_id, season_key, rule_id) do update
  set season_label = excluded.season_label,
      role_label = excluded.role_label,
      score = excluded.score,
      correct_count = excluded.correct_count,
      best_combo = excluded.best_combo,
      average_ms = excluded.average_ms,
      completed_at = excluded.completed_at,
      updated_at = now()
  where excluded.score > skill_quiz_scores.score
  returning * into v_saved;

  if v_saved.id is null then
    select *
    into v_saved
    from public.skill_quiz_scores
    where user_id = v_user_id
      and season_key = p_season_key
      and rule_id = p_rule_id;
  end if;

  select ranked.rank_position, ranked.total_count
  into v_rank, v_total
  from (
    select
      user_id,
      rank() over (order by score desc, completed_at asc) as rank_position,
      count(*) over () as total_count
    from public.skill_quiz_scores
    where season_key = p_season_key
      and rule_id = p_rule_id
  ) ranked
  where ranked.user_id = v_user_id;

  return jsonb_build_object(
    'rank', coalesce(v_rank, 0),
    'total', coalesce(v_total, 0),
    'score', v_saved.score,
    'correctCount', v_saved.correct_count,
    'bestCombo', v_saved.best_combo,
    'averageMs', v_saved.average_ms,
    'seasonKey', v_saved.season_key,
    'ruleId', v_saved.rule_id
  );
end;
$$;

create or replace function public.get_skill_quiz_my_rank(
  p_season_key text,
  p_rule_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_rank integer;
  v_total integer;
  v_score integer;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select ranked.rank_position, ranked.total_count, ranked.score
  into v_rank, v_total, v_score
  from (
    select
      user_id,
      score,
      rank() over (order by score desc, completed_at asc) as rank_position,
      count(*) over () as total_count
    from public.skill_quiz_scores
    where season_key = p_season_key
      and rule_id = p_rule_id
  ) ranked
  where ranked.user_id = v_user_id;

  if v_rank is null then
    return null;
  end if;

  return jsonb_build_object(
    'rank', v_rank,
    'total', v_total,
    'score', v_score,
    'seasonKey', p_season_key,
    'ruleId', p_rule_id
  );
end;
$$;

create or replace function public.get_skill_quiz_top10(
  p_season_key text,
  p_rule_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rankings jsonb := '[]'::jsonb;
begin
  select coalesce(jsonb_agg(row_to_json(ranked)), '[]'::jsonb)
  into v_rankings
  from (
    select
      rank_position as rank,
      public.skill_quiz_mask_email(u.email) as email,
      score,
      correct_count as "correctCount",
      best_combo as "bestCombo"
    from (
      select
        user_id,
        score,
        correct_count,
        best_combo,
        rank() over (order by score desc, completed_at asc) as rank_position
      from public.skill_quiz_scores
      where season_key = p_season_key
        and rule_id = p_rule_id
    ) ranked_scores
    join auth.users u on u.id = ranked_scores.user_id
    where rank_position <= 10
    order by rank_position asc
    limit 10
  ) ranked;

  return v_rankings;
end;
$$;

grant execute on function public.submit_skill_quiz_score(text, text, text, text, integer, integer, integer, numeric) to authenticated;
grant execute on function public.get_skill_quiz_my_rank(text, text) to authenticated;
grant execute on function public.get_skill_quiz_top10(text, text) to anon, authenticated;
