import {
  callRpc,
  getAnonId,
  hasSupabase,
  hasUserBearerToken,
  isIdleDevGameEnabled,
  json,
  readJson,
} from "./_shared.js";

export async function onRequest(context) {
  const { request } = context;
  if (!["GET", "POST"].includes(request.method)) {
    return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  if (!hasSupabase(context)) {
    return json({ playerId: null, ready: false });
  }

  try {
    if (!hasUserBearerToken(request, context)) {
      return json({
        playerId: null,
        player: null,
        official: false,
        ready: true,
      });
    }

    if (!(await isIdleDevGameEnabled(context))) {
      return json({
        playerId: null,
        player: null,
        official: false,
        enabled: false,
        ready: true,
      });
    }

    if (request.method === "GET") {
      const url = new URL(request.url);
      const anonId = url.searchParams.get("anonId") || request.headers.get("x-cpbv-anon-id");
      const player = await callRpc(context, request, "idle_dev_game_get_progress", {
        p_anon_id: anonId || null,
      });

      return json({
        playerId: player?.id || null,
        player: player || null,
        ready: true,
      });
    }

    const body = await readJson(request);
    const anonId = getAnonId(request, body);
    if (!anonId) {
      return json({ error: "ANON_ID_REQUIRED" }, 400);
    }

    const player = await callRpc(context, request, "idle_dev_game_save_progress", {
      p_anon_id: anonId,
      p_display_name: body.displayName || null,
      p_state: body.state || {},
      p_progress: body.progress || {},
    });

    const shouldStartOfficialRun = body.progress?.currentTier === "LIVE";
    const officialRun =
      player?.id && shouldStartOfficialRun
        ? await callRpc(context, request, "idle_dev_game_start_official_run", {
            p_player_id: player.id,
            p_anon_id: anonId,
          })
        : null;

    await callRpc(context, request, "idle_dev_game_log_event", {
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

    return json({
      playerId: player?.id || null,
      player: player || null,
      officialRun,
      playerCounted: Boolean(player?.id),
      official: true,
      enabled: true,
      ready: true,
    });
  } catch (error) {
    console.error(error);
    return json({ playerId: null, ready: false });
  }
}
