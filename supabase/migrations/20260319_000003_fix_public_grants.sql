grant usage on schema public to anon, authenticated;

grant select on public.profiles to authenticated;
grant select on public.seasons to anon, authenticated;
grant select on public.season_entries to anon, authenticated;
grant select on public.daily_roll_logs to authenticated;
