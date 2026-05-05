import { getSupabaseClient } from "./supabase";

export type HomeChangeMessageSetting = {
  message: string;
  updated_at: string | null;
};

function normalizeSetting(data: unknown): HomeChangeMessageSetting {
  const row = Array.isArray(data) ? data[0] : data;

  if (!row || typeof row !== "object") {
    return { message: "", updated_at: null };
  }

  const value = row as { message?: unknown; updated_at?: unknown };
  return {
    message: typeof value.message === "string" ? value.message : "",
    updated_at: typeof value.updated_at === "string" ? value.updated_at : null,
  };
}

export async function getHomeChangeMessage(): Promise<HomeChangeMessageSetting> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { message: "", updated_at: null };
  }

  const { data, error } = await supabase.rpc("get_home_change_message");

  if (error) {
    throw new Error(error.message || "메인 변경사항 메시지를 불러오지 못했습니다.");
  }

  return normalizeSetting(data);
}

export async function adminGetHomeChangeMessage(
  sessionToken: string
): Promise<HomeChangeMessageSetting> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("서비스 설정이 필요합니다.");
  }

  const { data, error } = await supabase.rpc("admin_get_home_change_message", {
    p_session_token: sessionToken,
  });

  if (error) {
    throw new Error(error.message || "메인 변경사항 메시지를 불러오지 못했습니다.");
  }

  return normalizeSetting(data);
}

export async function adminUpdateHomeChangeMessage(
  sessionToken: string,
  message: string
): Promise<HomeChangeMessageSetting> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("서비스 설정이 필요합니다.");
  }

  const { data, error } = await supabase.rpc("admin_update_home_change_message", {
    p_session_token: sessionToken,
    p_message: message,
  });

  if (error) {
    throw new Error(error.message || "메인 변경사항 메시지를 저장하지 못했습니다.");
  }

  return normalizeSetting(data);
}
