function readEnv(context) {
  const env = context?.env ?? {};
  const fallbackEnv =
    typeof process !== "undefined" && process.env ? process.env : {};

  return {
    supabaseUrl:
      env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? fallbackEnv.VITE_SUPABASE_URL ?? fallbackEnv.SUPABASE_URL,
    supabaseAnonKey:
      env.VITE_SUPABASE_ANON_KEY ??
      env.SUPABASE_ANON_KEY ??
      fallbackEnv.VITE_SUPABASE_ANON_KEY ??
      fallbackEnv.SUPABASE_ANON_KEY,
  };
}

export function json(payload, status = 200, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", "no-store");
  }

  return new Response(JSON.stringify(payload), {
    ...init,
    status,
    headers,
  });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function getBearerToken(request, context) {
  const { supabaseAnonKey } = readEnv(context);
  const authHeader = request.headers.get("authorization");
  return authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : supabaseAnonKey;
}

export function hasUserBearerToken(request, context) {
  const { supabaseAnonKey } = readEnv(context);
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  return Boolean(token && token !== supabaseAnonKey);
}

export function getAnonId(request, body = {}) {
  return body?.anonId || request.headers.get("x-cpbv-anon-id") || null;
}

export function hasSupabase(context) {
  const { supabaseUrl, supabaseAnonKey } = readEnv(context);
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export async function callRpc(context, request, name, payload) {
  const { supabaseUrl, supabaseAnonKey } = readEnv(context);
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${getBearerToken(request, context)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`${name} failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

let cachedIdleGameConfig = {
  enabled: false,
  expiresAt: 0,
};

export async function isIdleDevGameEnabled(context) {
  const { supabaseUrl, supabaseAnonKey } = readEnv(context);
  if (!supabaseUrl || !supabaseAnonKey) {
    return false;
  }

  const now = Date.now();
  if (cachedIdleGameConfig.expiresAt > now) {
    return cachedIdleGameConfig.enabled;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_idle_dev_game_config`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
      signal: controller.signal,
    });

    if (!response.ok) {
      cachedIdleGameConfig = { enabled: false, expiresAt: now + 30_000 };
      return false;
    }

    const data = await response.json();
    const row = Array.isArray(data) ? data[0] : data;
    cachedIdleGameConfig = { enabled: row?.enabled === true, expiresAt: now + 60_000 };
    return cachedIdleGameConfig.enabled;
  } catch {
    cachedIdleGameConfig = { enabled: false, expiresAt: now + 30_000 };
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getRank(context, category, score) {
  const { supabaseUrl, supabaseAnonKey } = readEnv(context);
  const operator = category === "fastest_mlb_seconds" ? "lt" : "gt";
  const query = new URL(`${supabaseUrl}/rest/v1/idle_dev_game_leaderboard_entries`);
  query.searchParams.set("select", "id");
  query.searchParams.set("category", `eq.${category}`);
  query.searchParams.set("score", `${operator}.${score}`);
  query.searchParams.set("user_id", "not.is.null");
  query.searchParams.set("moderation_status", "eq.visible");

  const rankResponse = await fetch(query, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      Prefer: "count=exact",
    },
  });

  if (!rankResponse.ok) {
    return null;
  }

  const contentRange = rankResponse.headers.get("content-range") || "";
  const betterCount = Number(contentRange.split("/")[1] || 0);
  return Number.isFinite(betterCount) ? betterCount + 1 : null;
}
