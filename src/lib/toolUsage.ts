import { getSupabaseClient } from "./supabase";

type ToolUsageEventInput = {
  tool: string;
  mode?: string | null;
  cardType?: string | null;
  targetGrade?: string | null;
  rollCount?: number;
  resultScore?: number | null;
  resultGrade?: string | null;
  metadata?: Record<string, unknown>;
};

function requireSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase 설정이 필요합니다.");
  }

  return supabase;
}

export async function logToolUsageEvent(input: ToolUsageEventInput): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.rpc("log_tool_usage_event", {
    p_tool: input.tool,
    p_mode: input.mode ?? null,
    p_card_type: input.cardType ?? null,
    p_target_grade: input.targetGrade ?? null,
    p_roll_count: input.rollCount ?? 1,
    p_result_score: input.resultScore ?? null,
    p_result_grade: input.resultGrade ?? null,
    p_metadata: input.metadata ?? {},
  });

  if (error) {
    throw new Error(error.message || "tool usage logging failed");
  }
}
