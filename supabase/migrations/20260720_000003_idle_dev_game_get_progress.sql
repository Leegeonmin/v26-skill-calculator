create or replace function public.idle_dev_game_get_progress(
  p_anon_id text default null
)
returns public.idle_dev_game_players
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_player public.idle_dev_game_players;
begin
  if v_user_id is null then
    return null;
  end if;

  select *
    into v_player
  from public.idle_dev_game_players
  where user_id = v_user_id
  order by updated_at desc
  limit 1;

  if v_player.id is not null then
    return v_player;
  end if;

  if nullif(p_anon_id, '') is not null then
    select *
      into v_player
    from public.idle_dev_game_players
    where anon_id = nullif(p_anon_id, '')
    order by updated_at desc
    limit 1;
  end if;

  return v_player;
end;
$$;

grant execute on function public.idle_dev_game_get_progress(text) to authenticated;
