import { callRpc, getAnonId, sendJson, SUPABASE_ANON_KEY, SUPABASE_URL } from "./_supabase.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "METHOD_NOT_ALLOWED" });
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    sendJson(response, 200, { playerId: null, ready: false });
    return;
  }

  try {
    const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};
    const anonId = getAnonId(request, body);
    if (!anonId) {
      sendJson(response, 400, { error: "ANON_ID_REQUIRED" });
      return;
    }

    const player = await callRpc(request, "idle_dev_game_save_progress", {
      p_anon_id: anonId,
      p_display_name: body.displayName || null,
      p_state: body.state || {},
      p_progress: body.progress || {},
    });

    await callRpc(request, "idle_dev_game_log_event", {
      p_player_id: player?.id || null,
      p_anon_id: anonId,
      p_event_type: "session_start",
      p_tier: body.progress?.currentTier || null,
      p_training_delta: null,
      p_total_training: body.progress?.totalTraining || null,
      p_swing_count: body.progress?.swingCount || null,
      p_homerun_count: body.progress?.homerunCount || null,
      p_metadata: { displayName: body.displayName || null },
    });

    sendJson(response, 200, {
      playerId: player?.id || null,
      player: player || null,
      playerCounted: Boolean(player?.id),
      ready: true,
    });
  } catch (error) {
    console.error(error);
    sendJson(response, 200, { playerId: null, ready: false });
  }
}
