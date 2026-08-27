import { hasSupabase, json } from "./_shared.js";

function emptyStats() {
  return {
    mlbSuccessCount: 0,
    playerCount: 0,
    swingCount: 0,
    homerunCount: 0,
  };
}

export async function onRequest(context) {
  if (context.request.method !== "GET") {
    return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  const cacheHeaders = {
    "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
  };

  if (!hasSupabase(context)) {
    return json(emptyStats(), 200, { headers: cacheHeaders });
  }

  const supabaseUrl = context.env.VITE_SUPABASE_URL ?? context.env.SUPABASE_URL;
  const supabaseAnonKey =
    context.env.VITE_SUPABASE_ANON_KEY ?? context.env.SUPABASE_ANON_KEY;

  try {
    const statsResponse = await fetch(
      `${supabaseUrl}/rest/v1/idle_dev_game_public_stats?select=*`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      }
    );

    if (!statsResponse.ok) {
      throw new Error(`Supabase stats request failed: ${statsResponse.status}`);
    }

    const rows = await statsResponse.json();
    const stats = Array.isArray(rows) ? rows[0] : null;

    return json(
      {
        mlbSuccessCount: Number(stats?.mlb_success_count ?? 0),
        playerCount: Number(stats?.player_count ?? 0),
        swingCount: Number(stats?.swing_count ?? 0),
        homerunCount: Number(stats?.homerun_count ?? 0),
      },
      200,
      { headers: cacheHeaders }
    );
  } catch (error) {
    console.error(error);
    return json(emptyStats(), 200, { headers: cacheHeaders });
  }
}
