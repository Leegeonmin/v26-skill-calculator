create or replace function public.idle_dev_game_random_display_name()
returns text
language sql
volatile
as $$
  select concat(U&'\D0C0\C790', (1000 + floor(random() * 9000))::integer);
$$;

update public.idle_dev_game_players
set display_name = regexp_replace(display_name, concat('^', U&'\D64D\D0C0\C790'), U&'\D0C0\C790'),
    updated_at = now()
where display_name ~ concat('^', U&'\D64D\D0C0\C790[0-9]{4}$');

update public.idle_dev_game_leaderboard_entries
set display_name = regexp_replace(display_name, concat('^', U&'\D64D\D0C0\C790'), U&'\D0C0\C790'),
    updated_at = now()
where display_name ~ concat('^', U&'\D64D\D0C0\C790[0-9]{4}$');

grant execute on function public.idle_dev_game_random_display_name() to anon, authenticated;
