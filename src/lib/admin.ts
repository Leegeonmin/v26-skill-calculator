import { getSupabaseClient } from "./supabase";

export type AdminSession = {
  session_token: string;
  username: string;
  expires_at: string;
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

