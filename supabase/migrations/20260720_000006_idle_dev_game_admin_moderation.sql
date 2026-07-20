alter table public.idle_dev_game_leaderboard_entries
  add column if not exists moderation_status text not null default 'visible'
    check (moderation_status in ('visible', 'hidden', 'excluded')),
  add column if not exists moderation_note text,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by text;

create index if not exists idx_idle_dev_game_leaderboard_visible_fastest
  on public.idle_dev_game_leaderboard_entries (category, score asc, achieved_at asc)
  where category = 'fastest_mlb_seconds'
    and user_id is not null
    and moderation_status = 'visible';

create or replace function public.idle_dev_game_clean_display_name(p_name text)
returns text
language plpgsql
immutable
as $$
declare
  v_name text := left(regexp_replace(coalesce(p_name, ''), '[^0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ]', '', 'g'), 8);
begin
  if length(v_name) < 2 then
    return '익명타자';
  end if;

  if v_name ~* '(시발|씨발|ㅅㅂ|병신|븅신|개새|좆|지랄|fuck|shit|sex|admin|관리자|운영자|카톡|오픈채팅|텔레그램)' then
    return '익명타자';
  end if;

  return v_name;
end;
$$;

create or replace function public.idle_dev_game_get_leaderboard(
  p_category text,
  p_limit integer default 50
)
returns table (
  rank bigint,
  display_name text,
  score numeric,
  score_label text,
  achieved_at timestamptz
)
language sql
stable
as $$
  select
    row_number() over (
      order by
        case when e.category = 'fastest_mlb_seconds' then e.score end asc,
        case when e.category <> 'fastest_mlb_seconds' then e.score end desc,
        e.achieved_at asc
    ) as rank,
    e.display_name,
    e.score,
    e.score_label,
    e.achieved_at
  from public.idle_dev_game_leaderboard_entries e
  where e.category = p_category
    and e.user_id is not null
    and e.moderation_status = 'visible'
  order by
    case when e.category = 'fastest_mlb_seconds' then e.score end asc,
    case when e.category <> 'fastest_mlb_seconds' then e.score end desc,
    e.achieved_at asc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

create or replace function public.admin_get_idle_dev_game_rankings(
  p_session_token uuid,
  p_limit integer default 100
)
returns table (
  entry_id uuid,
  rank bigint,
  email text,
  display_name text,
  score numeric,
  score_label text,
  achieved_at timestamptz,
  moderation_status text,
  moderation_note text,
  player_id uuid,
  user_id uuid
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
    ranked.id as entry_id,
    ranked.rank,
    au.email::text,
    ranked.display_name,
    ranked.score,
    ranked.score_label,
    ranked.achieved_at,
    ranked.moderation_status,
    ranked.moderation_note,
    ranked.player_id,
    ranked.user_id
  from (
    select
      e.*,
      case
        when e.moderation_status = 'visible' then row_number() over (
          partition by e.moderation_status
          order by e.score asc, e.achieved_at asc
        )
        else null
      end as rank
    from public.idle_dev_game_leaderboard_entries e
    where e.category = 'fastest_mlb_seconds'
      and e.user_id is not null
  ) ranked
  left join auth.users au on au.id = ranked.user_id
  order by
    case ranked.moderation_status
      when 'visible' then 0
      when 'hidden' then 1
      else 2
    end,
    ranked.score asc,
    ranked.achieved_at asc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
end;
$$;

create or replace function public.admin_update_idle_dev_game_ranking_entry(
  p_session_token uuid,
  p_entry_id uuid,
  p_moderation_status text,
  p_display_name text default null,
  p_note text default null
)
returns table (
  entry_id uuid,
  moderation_status text,
  display_name text,
  moderation_note text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin text;
  v_status text := coalesce(nullif(p_moderation_status, ''), 'visible');
begin
  select a.username
    into v_admin
  from public.admin_sessions s
  join public.admin_accounts a on a.id = s.account_id
  where s.session_token = p_session_token
    and s.expires_at > now()
  limit 1;

  if v_admin is null then
    raise exception 'INVALID_ADMIN_SESSION';
  end if;

  if v_status not in ('visible', 'hidden', 'excluded') then
    raise exception 'INVALID_MODERATION_STATUS';
  end if;

  update public.idle_dev_game_leaderboard_entries e
  set moderation_status = v_status,
      display_name = case
        when p_display_name is null then e.display_name
        else public.idle_dev_game_clean_display_name(p_display_name)
      end,
      moderation_note = nullif(left(coalesce(p_note, ''), 240), ''),
      moderated_at = now(),
      moderated_by = v_admin,
      updated_at = now()
  where e.id = p_entry_id
    and e.category = 'fastest_mlb_seconds'
  returning e.id, e.moderation_status, e.display_name, e.moderation_note
  into entry_id, moderation_status, display_name, moderation_note;

  if entry_id is null then
    raise exception 'RANKING_ENTRY_NOT_FOUND';
  end if;

  return next;
end;
$$;

grant execute on function public.admin_get_idle_dev_game_rankings(uuid, integer) to anon, authenticated;
grant execute on function public.admin_update_idle_dev_game_ranking_entry(uuid, uuid, text, text, text) to anon, authenticated;
