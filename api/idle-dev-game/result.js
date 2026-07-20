import {
  callRpc,
  getAnonId,
  hasUserBearerToken,
  isIdleDevGameEnabled,
  sendJson,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "./_supabase.js";

async function getRank(category, score) {
  const operator = category === "fastest_mlb_seconds" ? "lt" : "gt";
  const query = new URL(`${SUPABASE_URL}/rest/v1/idle_dev_game_leaderboard_entries`);
  query.searchParams.set("select", "id");
  query.searchParams.set("category", `eq.${category}`);
  query.searchParams.set("score", `${operator}.${score}`);
  query.searchParams.set("user_id", "not.is.null");

  const rankResponse = await fetch(query, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Prefer: "count=exact",
    },
  });

  if (!rankResponse.ok) return null;

  const contentRange = rankResponse.headers.get("content-range") || "";
  const betterCount = Number(contentRange.split("/")[1] || 0);
  return Number.isFinite(betterCount) ? betterCount + 1 : null;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "METHOD_NOT_ALLOWED" });
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    sendJson(response, 200, { playerId: null, rank: null, official: false, ready: false });
    return;
  }

  if (!(await isIdleDevGameEnabled())) {
    sendJson(response, 200, {
      playerId: null,
      rank: null,
      official: false,
      enabled: false,
      ready: true,
    });
    return;
  }

  if (!hasUserBearerToken(request)) {
    sendJson(response, 200, { playerId: null, rank: null, official: false, ready: true });
    return;
  }

  try {
    const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};
    const anonId = getAnonId(request, body);
    if (!anonId) {
      sendJson(response, 400, { error: "ANON_ID_REQUIRED" });
      return;
    }

    const progress = body.progress || {};
    const result = body.result || {};
    const completion = await callRpc(request, "idle_dev_game_complete_official_run", {
      p_anon_id: anonId,
      p_display_name: body.displayName || result.playerName || null,
      p_state: body.state || {},
      p_progress: progress,
      p_metadata: result,
    });

    const player = completion?.player || null;
    const score = Number(completion?.elapsedSeconds || 0);

    await callRpc(request, "idle_dev_game_log_event", {
      p_player_id: player?.id || null,
      p_anon_id: anonId,
      p_event_type: "mlb_success",
      p_tier: progress.currentTier || result.tier || null,
      p_training_delta: null,
      p_total_training: progress.totalTraining || result.totalTraining || null,
      p_swing_count: progress.swingCount || null,
      p_homerun_count: progress.homerunCount || null,
      p_metadata: {
        ...result,
        serverElapsedSeconds: score,
        officialRunId: completion?.runId || null,
      },
    });

    sendJson(response, 200, {
      playerId: player?.id || null,
      rank: score > 0 ? await getRank("fastest_mlb_seconds", score) : null,
      elapsedSeconds: score || null,
      scoreLabel: completion?.scoreLabel || null,
      official: true,
      enabled: true,
      ready: true,
    });
  } catch (error) {
    console.error(error);
    sendJson(response, 200, { playerId: null, rank: null, official: false, ready: false });
  }
}
