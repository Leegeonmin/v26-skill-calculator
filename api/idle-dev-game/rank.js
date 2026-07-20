const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

function hasUserBearerToken(request) {
  const authHeader = request.headers.authorization || request.headers.Authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  return Boolean(token && token !== SUPABASE_ANON_KEY);
}

function sendJson(response, status, payload) {
  response.setHeader("Cache-Control", "no-store");
  response.status(status).json(payload);
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "METHOD_NOT_ALLOWED" });
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    sendJson(response, 200, { rank: null, ready: false });
    return;
  }

  if (!hasUserBearerToken(request)) {
    sendJson(response, 200, { rank: null, official: false, ready: true });
    return;
  }

  try {
    const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};
    const category = String(body.category || "");
    const score = Number(body.score);

    if (!category || !Number.isFinite(score)) {
      sendJson(response, 400, { error: "INVALID_INPUT" });
      return;
    }

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

    if (!rankResponse.ok) {
      throw new Error(`Supabase rank request failed: ${rankResponse.status}`);
    }

    const contentRange = rankResponse.headers.get("content-range") || "";
    const higherCount = Number(contentRange.split("/")[1] || 0);
    sendJson(response, 200, {
      rank: Number.isFinite(higherCount) ? higherCount + 1 : null,
      ready: true,
    });
  } catch (error) {
    console.error(error);
    sendJson(response, 200, { rank: null, ready: false });
  }
}
