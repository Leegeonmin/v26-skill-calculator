import { getSupabaseClient } from "./supabase";

export type SkillQuizRankSummary = {
  rank: number;
  total: number;
  score?: number;
  seasonKey?: string;
  ruleId?: string;
};

export type SkillQuizTopRank = {
  rank: number;
  email: string;
  score: number;
  correctCount: number;
  bestCombo: number;
};

type SubmitSkillQuizScoreInput = {
  seasonKey: string;
  seasonLabel: string;
  ruleId: string;
  roleLabel: string;
  score: number;
  correctCount: number;
  bestCombo: number;
  averageMs: number;
};

function requireSupabase() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  return supabase;
}

function normalizeRankSummary(value: unknown): SkillQuizRankSummary | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const rank = Number(record.rank);
  const total = Number(record.total);

  if (!Number.isFinite(rank) || !Number.isFinite(total) || rank <= 0 || total <= 0) {
    return null;
  }

  return {
    rank,
    total,
    score: typeof record.score === "number" ? record.score : Number(record.score) || undefined,
    seasonKey: typeof record.seasonKey === "string" ? record.seasonKey : undefined,
    ruleId: typeof record.ruleId === "string" ? record.ruleId : undefined,
  };
}

function normalizeTopRankings(value: unknown): SkillQuizTopRank[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const record = item as Record<string, unknown>;
      const rank = Number(record.rank);
      const score = Number(record.score);
      const correctCount = Number(record.correctCount);
      const bestCombo = Number(record.bestCombo);

      if (
        !Number.isFinite(rank) ||
        !Number.isFinite(score) ||
        !Number.isFinite(correctCount) ||
        !Number.isFinite(bestCombo)
      ) {
        return null;
      }

      return {
        rank,
        email: typeof record.email === "string" ? record.email : "unknown",
        score,
        correctCount,
        bestCombo,
      };
    })
    .filter((item): item is SkillQuizTopRank => item !== null);
}

export async function submitSkillQuizScore(input: SubmitSkillQuizScoreInput) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("submit_skill_quiz_score", {
    p_season_key: input.seasonKey,
    p_season_label: input.seasonLabel,
    p_rule_id: input.ruleId,
    p_role_label: input.roleLabel,
    p_score: Math.round(input.score),
    p_correct_count: input.correctCount,
    p_best_combo: input.bestCombo,
    p_average_ms: Number(input.averageMs.toFixed(2)),
  });

  if (error) {
    throw error;
  }

  return normalizeRankSummary(data);
}

export async function getSkillQuizMyRank(seasonKey: string, ruleId: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("get_skill_quiz_my_rank", {
    p_season_key: seasonKey,
    p_rule_id: ruleId,
  });

  if (error) {
    throw error;
  }

  return normalizeRankSummary(data);
}

export async function getSkillQuizTop10(seasonKey: string, ruleId: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("get_skill_quiz_top10", {
    p_season_key: seasonKey,
    p_rule_id: ruleId,
  });

  if (error) {
    throw error;
  }

  return normalizeTopRankings(data);
}
