create or replace function public.idle_dev_game_save_progress(
  p_anon_id text,
  p_display_name text default null,
  p_state jsonb default '{}'::jsonb,
  p_progress jsonb default '{}'::jsonb
)
returns public.idle_dev_game_players
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.idle_dev_game_players;
begin
  v_player := public.idle_dev_game_upsert_player(p_anon_id, p_display_name, p_state);

  update public.idle_dev_game_players
  set display_name = coalesce(nullif(p_display_name, ''), display_name),
      current_tier = coalesce(nullif(p_progress ->> 'currentTier', ''), current_tier),
      total_training = greatest(coalesce((p_progress ->> 'totalTraining')::numeric, total_training), total_training),
      swing_count = greatest(coalesce((p_progress ->> 'swingCount')::integer, swing_count), swing_count),
      homerun_count = greatest(coalesce((p_progress ->> 'homerunCount')::integer, homerun_count), homerun_count),
      mlb_success_count = greatest(coalesce((p_progress ->> 'mlbSuccessCount')::integer, mlb_success_count), mlb_success_count),
      best_swing_training = greatest(coalesce((p_progress ->> 'bestSwingTraining')::numeric, best_swing_training), best_swing_training),
      best_homerun_training = greatest(coalesce((p_progress ->> 'bestHomerunTraining')::numeric, best_homerun_training), best_homerun_training),
      best_total_level = greatest(coalesce((p_progress ->> 'bestTotalLevel')::integer, best_total_level), best_total_level),
      last_state = coalesce(p_state, last_state),
      updated_at = now()
  where id = v_player.id
  returning * into v_player;

  return v_player;
end;
$$;

grant execute on function public.idle_dev_game_save_progress(text, text, jsonb, jsonb) to anon, authenticated;
