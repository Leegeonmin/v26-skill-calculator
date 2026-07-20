export const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export function getBearerToken(request) {
  const authHeader = request.headers.authorization || request.headers.Authorization;
  return authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : SUPABASE_ANON_KEY;
}

export function hasUserBearerToken(request) {
  const authHeader = request.headers.authorization || request.headers.Authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  return Boolean(token && token !== SUPABASE_ANON_KEY);
}

export function getAnonId(request, body) {
  return body?.anonId || request.headers["x-cpbv-anon-id"] || request.headers["X-CPBV-Anon-ID"] || null;
}

export async function callRpc(request, name, payload) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${getBearerToken(request)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`${name} failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export async function isIdleDevGameEnabled() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return false;
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_idle_dev_game_config`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    return false;
  }

  const data = await response.json();
  const row = Array.isArray(data) ? data[0] : data;
  return row?.enabled === true;
}

export function sendJson(response, status, payload) {
  response.setHeader("Cache-Control", "no-store");
  response.status(status).json(payload);
}
