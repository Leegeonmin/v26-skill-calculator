import { getRank, hasSupabase, hasUserBearerToken, json, readJson } from "./_shared.js";

export async function onRequest(context) {
  const { request } = context;
  if (request.method !== "POST") {
    return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  if (!hasSupabase(context)) {
    return json({ rank: null, ready: false });
  }

  if (!hasUserBearerToken(request, context)) {
    return json({ rank: null, official: false, ready: true });
  }

  try {
    const body = await readJson(request);
    const category = String(body.category || "");
    const score = Number(body.score);

    if (!category || !Number.isFinite(score)) {
      return json({ error: "INVALID_INPUT" }, 400);
    }

    return json({
      rank: await getRank(context, category, score),
      ready: true,
    });
  } catch (error) {
    console.error(error);
    return json({ rank: null, ready: false });
  }
}
