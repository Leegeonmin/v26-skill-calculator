import { hasSupabase, isIdleDevGameEnabled, json } from "./_shared.js";

export async function onRequest(context) {
  if (context.request.method !== "GET") {
    return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  if (!hasSupabase(context)) {
    return json({ enabled: false, ready: false });
  }

  try {
    return json({
      enabled: await isIdleDevGameEnabled(context),
      updatedAt: null,
      ready: true,
    });
  } catch (error) {
    console.error(error);
    return json({ enabled: false, ready: false });
  }
}
