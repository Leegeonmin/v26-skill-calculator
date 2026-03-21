import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabase";
import type {
  DailyRollLog,
  EndedSeasonSummary,
  PendingDailyRoll,
  RankingCategory,
  RankingRow,
  Season,
  SeasonEntry,
  StoredSkillSet,
} from "../types/ranking";

function requireSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  return supabase;
}

function unwrapSingle<T>(response: PostgrestSingleResponse<T>): T | null {
  if (response.error) {
    const nextError = new Error(response.error.message || "Supabase request failed");
    nextError.name = response.error.code || "PostgrestError";
    throw nextError;
  }

  return response.data;
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return [error.name, error.message].filter(Boolean).join(": ");
  }

  if (typeof error === "object" && error !== null) {
    const maybeError = error as {
      code?: string;
      message?: string;
      details?: string;
      hint?: string;
    };

    return [maybeError.code, maybeError.message, maybeError.details, maybeError.hint]
      .filter(Boolean)
      .join(" | ");
  }

  return String(error);
}

export async function getCurrentSeason(): Promise<Season | null> {
  const supabase = requireSupabase();
  const response = await supabase.rpc("current_active_season");
  return unwrapSingle(response);
}

export async function ensureWeeklyActiveSeason(): Promise<Season> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("ensure_weekly_active_season");

  if (error) {
    const nextError = new Error(error.message || "ensure_weekly_active_season failed");
    nextError.name = error.code || "PostgrestError";
    throw nextError;
  }

  return data as Season;
}

export async function getSeasonWithFallback(): Promise<Season | null> {
  try {
    return await ensureWeeklyActiveSeason();
  } catch (error) {
    const message = normalizeErrorMessage(error).toLowerCase();

    if (
      message.includes("ensure_weekly_active_season") ||
      message.includes("42883") ||
      message.includes("pgrst202") ||
      message.includes("permission denied") ||
      message.includes("update requires a where clause") ||
      message.toLowerCase().includes("function")
    ) {
      return await getCurrentSeason();
    }

    throw error;
  }
}

export async function createInitialSeason(name?: string): Promise<Season> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("create_initial_season", {
    p_name: name ?? null,
  });

  if (error) {
    throw error;
  }

  return data as Season;
}

export async function getCurrentKstDate(): Promise<string> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("current_kst_date");

  if (error) {
    throw error;
  }

  return data as string;
}

export async function getMySeasonEntry(seasonId: string): Promise<SeasonEntry | null> {
  const supabase = requireSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const response = await supabase
    .from("season_entries")
    .select("*")
    .eq("season_id", seasonId)
    .eq("user_id", user.id)
    .maybeSingle();

  return unwrapSingle(response as PostgrestSingleResponse<SeasonEntry | null>);
}

export async function getTodayRollLog(entryId: string): Promise<DailyRollLog | null> {
  const supabase = requireSupabase();
  const rollDateKst = await getCurrentKstDate();

  const response = await supabase
    .from("daily_roll_logs")
    .select("*")
    .eq("entry_id", entryId)
    .eq("roll_date_kst", rollDateKst)
    .maybeSingle();

  return unwrapSingle(response as PostgrestSingleResponse<DailyRollLog | null>);
}

export async function getPendingDailyRoll(entryId: string): Promise<PendingDailyRoll | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("get_pending_daily_rank_roll", {
    p_entry_id: entryId,
  });

  if (error) {
    throw error;
  }

  const pending = Array.isArray(data) ? data[0] : data;
  return (pending as PendingDailyRoll | null) ?? null;
}

export async function joinSeason(
  category: RankingCategory,
  initialSkills: StoredSkillSet,
  initialScore: number
): Promise<SeasonEntry> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("join_season", {
    p_category: category,
    p_initial_skills: initialSkills,
    p_initial_score: initialScore,
  });

  if (error) {
    throw error;
  }

  return data as SeasonEntry;
}

export async function submitDailyRankRoll(input: {
  entryId: string;
  beforeSkills: StoredSkillSet;
  rolledSkills: StoredSkillSet;
  selectedResult: "keep" | "replace";
  finalSkills: StoredSkillSet;
  finalScore: number;
}): Promise<SeasonEntry> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("submit_daily_rank_roll", {
    p_entry_id: input.entryId,
    p_before_skills: input.beforeSkills,
    p_rolled_skills: input.rolledSkills,
    p_selected_result: input.selectedResult,
    p_final_skills: input.finalSkills,
    p_final_score: input.finalScore,
  });

  if (error) {
    throw error;
  }

  return data as SeasonEntry;
}

export async function createPendingDailyRankRoll(input: {
  entryId: string;
  beforeSkills: StoredSkillSet;
  beforeScore: number;
  rolledSkills: StoredSkillSet;
  rolledScore: number;
}): Promise<PendingDailyRoll> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("create_pending_daily_rank_roll", {
    p_entry_id: input.entryId,
    p_before_skills: input.beforeSkills,
    p_before_score: input.beforeScore,
    p_rolled_skills: input.rolledSkills,
    p_rolled_score: input.rolledScore,
  });

  if (error) {
    throw error;
  }

  return data as PendingDailyRoll;
}

export async function resolvePendingDailyRankRoll(
  entryId: string,
  selectedResult: "keep" | "replace"
): Promise<SeasonEntry> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("resolve_pending_daily_rank_roll", {
    p_entry_id: entryId,
    p_selected_result: selectedResult,
  });

  if (error) {
    throw error;
  }

  return data as SeasonEntry;
}

export async function getSeasonRankings(
  seasonId: string,
  category: RankingCategory
): Promise<RankingRow[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("season_rankings")
    .select("*")
    .eq("season_id", seasonId)
    .eq("category", category)
    .order("rank_position", { ascending: true })
    .limit(10);

  if (error) {
    throw error;
  }

  return (data ?? []) as RankingRow[];
}

export async function getMySeasonRanking(
  seasonId: string,
  category: RankingCategory
): Promise<RankingRow | null> {
  const supabase = requireSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const response = await supabase
    .from("season_rankings")
    .select("*")
    .eq("season_id", seasonId)
    .eq("category", category)
    .eq("user_id", user.id)
    .maybeSingle();

  return unwrapSingle(response as PostgrestSingleResponse<RankingRow | null>);
}

export async function getLatestEndedSeasonSummary(): Promise<EndedSeasonSummary | null> {
  const supabase = requireSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: entryData, error: entryError } = await supabase
    .from("season_entries")
    .select(
      `
      season_id,
      category,
      current_skills,
      current_score,
      seasons!inner (
        id,
        name,
        starts_at,
        ends_at,
        status
      )
    `
    )
    .eq("user_id", user.id)
    .eq("seasons.status", "ended")
    .order("ends_at", { ascending: false, referencedTable: "seasons" })
    .limit(1)
    .maybeSingle();

  if (entryError) {
    throw entryError;
  }

  const latestEntry = entryData as
    | {
        season_id: string;
        category: RankingCategory;
        current_skills: StoredSkillSet;
        current_score: number;
        seasons: {
          id: string;
          name: string;
          starts_at: string;
          ends_at: string;
          status: string;
        };
      }
    | null;

  if (!latestEntry?.seasons?.id) {
    return null;
  }

  const ranking = await getMySeasonRanking(latestEntry.season_id, latestEntry.category);
  if (!ranking) {
    return null;
  }

  return {
    season_id: latestEntry.seasons.id,
    season_name: latestEntry.seasons.name,
    season_starts_at: latestEntry.seasons.starts_at,
    season_ends_at: latestEntry.seasons.ends_at,
    category: latestEntry.category,
    current_skills: latestEntry.current_skills,
    current_score: latestEntry.current_score,
    rank_position: ranking.rank_position,
  };
}

export async function getLastSeenSettlementSeasonId(): Promise<string | null> {
  const supabase = requireSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const response = await supabase
    .from("profiles")
    .select("last_seen_settlement_season_id")
    .eq("id", user.id)
    .maybeSingle();

  const profile = unwrapSingle(
    response as PostgrestSingleResponse<{ last_seen_settlement_season_id: string | null } | null>
  );

  return profile?.last_seen_settlement_season_id ?? null;
}

export async function setLastSeenSettlementSeasonId(seasonId: string): Promise<void> {
  const supabase = requireSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("AUTH_REQUIRED");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ last_seen_settlement_season_id: seasonId })
    .eq("id", user.id);

  if (error) {
    throw error;
  }
}
