import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabase";
import type { DailyRollLog, RankingCategory, RankingRow, Season, SeasonEntry, StoredSkillSet } from "../types/ranking";

function requireSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  return supabase;
}

function unwrapSingle<T>(response: PostgrestSingleResponse<T>): T | null {
  if (response.error) {
    throw response.error;
  }

  return response.data;
}

export async function getCurrentSeason(): Promise<Season | null> {
  const supabase = requireSupabase();
  const response = await supabase.rpc("current_active_season");
  return unwrapSingle(response);
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
  const response = await supabase
    .from("season_entries")
    .select("*")
    .eq("season_id", seasonId)
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
    .order("rank_position", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as RankingRow[];
}
