drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user_profile();

grant insert, update on public.profiles to authenticated;

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);
