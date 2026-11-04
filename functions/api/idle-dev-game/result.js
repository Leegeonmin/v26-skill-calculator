import {
  callRpc,
  getAnonId,
  getRank,
  hasSupabase,
  hasUserBearerToken,
  isIdleDevGameEnabled,
  json,
  readJson,
} from "./_shared.js";

export async function onRequest(context) {
  const { request } = context;
  if (request.method !== "POST") {
    return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  if (!hasSupabase(context)) {
    return json({ playerId: null, rank: null, official: false, ready: false });
  }

  if (!(await isIdleDevGameEnabled(context))) {
    return json({
      playerId: null,
      rank: null,
      official: false,
      enabled: false,
      ready: true,
    });
  }

  if (!hasUserBearerToken(request, context)) {
    return json({ playerId: null, rank: null, official: false, ready: true });
  }

  try {
    const body = await readJson(request);
    const anonId = getAnonId(request, body);
    if (!anonId) {
      return json({ error: "ANON_ID_REQUIRED" }, 400);
    }

    const progress = body.progress || {};
    const result = body.result || {};
    const completion = await callRpc(context, request, "idle_dev_game_complete_official_run", {
      p_anon_id: anonId,
      p_display_name: body.displayName || result.playerName || null,
      p_state: body.state || {},
      p_progress: progress,
      p_metadata: result,
    });

    const player = completion?.player || null;
    const score = Number(completion?.elapsedSeconds || 0);

    return json({
      playerId: player?.id || null,
      rank: score > 0 ? await getRank(context, "fastest_mlb_seconds", score) : null,
      elapsedSeconds: score || null,
      scoreLabel: completion?.scoreLabel || null,
      official: true,
      enabled: true,
      ready: true,
    });
  } catch (error) {
    console.error(error);
    return json({ playerId: null, rank: null, official: false, ready: false });
  }
}
