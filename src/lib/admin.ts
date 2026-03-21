import { getSupabaseClient } from "./supabase";

export type AdminSession = {
  session_token: string;
  username: string;
  expires_at: string;
};

export type AdminUsageSummary = {
  total_events: number;
  unique_sessions: number;
  avg_actions_per_session: number | null;
  advanced_manual_rolls: number;
  advanced_auto_runs: number;
  impact_auto_runs: number;
  hitter_events: number;
  pitcher_events: number;
  avg_rolls_to_s: number | null;
  avg_rolls_to_ssr_plus: number | null;
};

function requireSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase 설정이 필요합니다.");
  }

  return supabase;
}

export async function adminLogin(username: string, password: string): Promise<AdminSession> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("admin_login", {
    p_username: username,
    p_password: password,
  });

  if (error) {
    throw new Error(error.message || "관리자 로그인에 실패했습니다.");
  }

  const session = Array.isArray(data) ? data[0] : data;

  if (!session) {
    throw new Error("관리자 로그인에 실패했습니다.");
  }

  return session as AdminSession;
}

export async function adminValidateSession(sessionToken: string): Promise<AdminSession | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("admin_validate_session", {
    p_session_token: sessionToken,
  });

  if (error) {
    throw new Error(error.message || "관리자 세션 확인에 실패했습니다.");
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
    throw new Error(error.message || "관리자 로그아웃에 실패했습니다.");
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
    throw new Error(error.message || "통계 정보를 불러오지 못했습니다.");
  }

  const summary = Array.isArray(data) ? data[0] : data;
  return (summary as AdminUsageSummary | null) ?? null;
}
