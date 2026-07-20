const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export default async function handler(_request, response) {
  response.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    response.status(200).json({
      mlbSuccessCount: 0,
      playerCount: 0,
      swingCount: 0,
      homerunCount: 0,
    });
    return;
  }

  try {
    const statsResponse = await fetch(`${SUPABASE_URL}/rest/v1/idle_dev_game_public_stats?select=*`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!statsResponse.ok) {
      throw new Error(`Supabase stats request failed: ${statsResponse.status}`);
    }

    const rows = await statsResponse.json();
    const stats = Array.isArray(rows) ? rows[0] : null;

    response.status(200).json({
      mlbSuccessCount: Number(stats?.mlb_success_count ?? 0),
      playerCount: Number(stats?.player_count ?? 0),
      swingCount: Number(stats?.swing_count ?? 0),
      homerunCount: Number(stats?.homerun_count ?? 0),
    });
  } catch (error) {
    console.error(error);
    response.status(200).json({
      mlbSuccessCount: 0,
      playerCount: 0,
      swingCount: 0,
      homerunCount: 0,
    });
  }
}
