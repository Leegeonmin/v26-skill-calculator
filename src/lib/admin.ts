import { getSupabaseClient } from "./supabase";

export type AdminSession = {
  session_token: string;
  username: string;
  expires_at: string;
};

export type AdminUsageSummary = {
  total_events: number;
  today_events: number;
  seven_day_events: number;
  thirty_day_events: number;
  unique_sessions: number;
  avg_actions_per_session: number | null;
  advanced_manual_rolls: number;
  advanced_auto_runs: number;
  impact_auto_runs: number;
  hitter_events: number;
  pitcher_events: number;
  avg_rolls_to_s: number | null;
  avg_rolls_to_ssr_plus: number | null;
  ocr_total_requests: number;
  ocr_lineup_requests: number;
  ocr_public_lineup_requests: number;
  ocr_private_lineup_requests: number;
  ocr_skill_compare_requests: number;
  ocr_hitter_requests: number;
  ocr_pitcher_requests: number;
  ocr_saved_uploads: number;
  ocr_saved_hitter_uploads: number;
  ocr_saved_pitcher_uploads: number;
  ocr_public_snapshots: number;
  ocr_public_saved_uploads: number;
  ocr_public_pending_uploads: number;
  ocr_public_saved_hitter_uploads: number;
  ocr_public_saved_pitcher_uploads: number;
  ocr_breakdown: AdminOcrBreakdown[];
  tool_breakdown: AdminToolBreakdown[];
  recent_inquiries: AdminNoticeInquiry[];
};

export type AdminOcrBreakdown = {
  label: string;
  request_count: number;
  unique_sessions: number;
  saved_count: number;
  last_seen_at: string | null;
};

export type AdminToolBreakdown = {
  tool: string;
  event_count: number;
  unique_sessions: number;
  last_seen_at: string | null;
};

export type AdminNoticeInquiry = {
  id: string;
  message: string;
  contact: string | null;
  page_url: string | null;
  created_at: string;
};

export type AdminIdleGameRankingEntry = {
  entry_id: string;
  rank: number | null;
  email: string | null;
  display_name: string;
  score: number;
  score_label: string | null;
  achieved_at: string;
  moderation_status: "visible" | "hidden" | "excluded";
  moderation_note: string | null;
  player_id: string;
  user_id: string;
};

function requireSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("서비스 설정이 필요합니다.");
  }

  return supabase;
}

function adminError(error: unknown, fallbackMessage: string) {
  console.error("[admin]", error);
  return new Error(fallbackMessage);
}

function isInvalidCredentialError(error: { message?: string } | null) {
  return error?.message?.includes("INVALID_ADMIN_CREDENTIALS") ?? false;
}

export async function adminLogin(username: string, password: string): Promise<AdminSession> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("admin_login", {
    p_username: username,
    p_password: password,
  });

  if (error) {
    throw adminError(
      error,
      isInvalidCredentialError(error)
        ? "아이디 또는 비밀번호가 올바르지 않습니다."
        : "관리자 로그인에 실패했습니다."
    );
  }

  const session = Array.isArray(data) ? data[0] : data;

  if (!session) {
    throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
  }

  return session as AdminSession;
}

export async function adminValidateSession(sessionToken: string): Promise<AdminSession | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("admin_validate_session", {
    p_session_token: sessionToken,
  });

  if (error) {
    throw adminError(error, "관리자 세션을 확인하지 못했습니다. 다시 로그인해주세요.");
  }

  const session = Array.isArray(data) ? data[0] : data;
  return (session as AdminSession | null) ?? null;
}

export async function adminLogout(sessionToken: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.rpc("admin_logout", {
    p_session_token: sessionToken,
  });

  if (error) {
    throw adminError(error, "로그아웃 처리 중 오류가 발생했습니다.");
  }
}

export async function adminGetToolUsageSummary(
  sessionToken: string
): Promise<AdminUsageSummary | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("admin_get_tool_usage_summary", {
    p_session_token: sessionToken,
  });

  if (error) {
    throw adminError(error, "통계를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
  }

  const summary = Array.isArray(data) ? data[0] : data;
  return (summary as AdminUsageSummary | null) ?? null;
}

export async function adminGetIdleGameRankings(
  sessionToken: string
): Promise<AdminIdleGameRankingEntry[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("admin_get_idle_dev_game_rankings", {
    p_session_token: sessionToken,
    p_limit: 100,
  });

  if (error) {
    throw adminError(error, "타자 키우기 랭킹을 불러오지 못했습니다.");
  }

  return (Array.isArray(data) ? data : []) as AdminIdleGameRankingEntry[];
}

export async function adminUpdateIdleGameRankingEntry(input: {
  sessionToken: string;
  entryId: string;
  moderationStatus: AdminIdleGameRankingEntry["moderation_status"];
  displayName?: string | null;
  note?: string | null;
}): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.rpc("admin_update_idle_dev_game_ranking_entry", {
    p_session_token: input.sessionToken,
    p_entry_id: input.entryId,
    p_moderation_status: input.moderationStatus,
    p_display_name: input.displayName ?? null,
    p_note: input.note ?? null,
  });

  if (error) {
    throw adminError(error, "타자 키우기 랭킹 상태를 저장하지 못했습니다.");
  }
}
