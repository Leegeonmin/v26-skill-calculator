import { sendJson, SUPABASE_ANON_KEY, SUPABASE_URL } from "./_supabase.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, { error: "METHOD_NOT_ALLOWED" });
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    sendJson(response, 200, { enabled: false, ready: false });
    return;
  }

  try {
    const configResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_idle_dev_game_config`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!configResponse.ok) {
      throw new Error(`config request failed: ${configResponse.status}`);
    }

    const data = await configResponse.json();
    const row = Array.isArray(data) ? data[0] : data;
    sendJson(response, 200, {
      enabled: row?.enabled === true,
      updatedAt: row?.updated_at ?? null,
      ready: true,
    });
  } catch (error) {
    console.error(error);
    sendJson(response, 200, { enabled: false, ready: false });
  }
}
