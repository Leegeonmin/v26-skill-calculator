import { isIdleDevGameEnabled, sendJson, SUPABASE_ANON_KEY, SUPABASE_URL } from "./_supabase.js";

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
    sendJson(response, 200, {
      enabled: await isIdleDevGameEnabled(),
      updatedAt: null,
      ready: true,
    });
  } catch (error) {
    console.error(error);
    sendJson(response, 200, { enabled: false, ready: false });
  }
}
