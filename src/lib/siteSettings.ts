import { getSupabaseClient } from "./supabase";

export type HomeChangeMessageSetting = {
  message: string;
  updated_at: string | null;
};

const HOME_CHANGE_CACHE_KEY = "v26-home-change-message-cache";
const HOME_CHANGE_CACHE_TTL_MS = 10 * 60 * 1000;

type CachedHomeChangeMessage = HomeChangeMessageSetting & {
  cached_at: number;
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

function readHomeChangeMessageCache(): HomeChangeMessageSetting | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawCache = window.localStorage.getItem(HOME_CHANGE_CACHE_KEY);
    if (!rawCache) {
      return null;
    }

    const cache = JSON.parse(rawCache) as Partial<CachedHomeChangeMessage>;
    if (
      typeof cache.cached_at !== "number" ||
      Date.now() - cache.cached_at > HOME_CHANGE_CACHE_TTL_MS
    ) {
      window.localStorage.removeItem(HOME_CHANGE_CACHE_KEY);
      return null;
    }

    return {
      message: typeof cache.message === "string" ? cache.message : "",
      updated_at: typeof cache.updated_at === "string" ? cache.updated_at : null,
    };
  } catch {
    window.localStorage.removeItem(HOME_CHANGE_CACHE_KEY);
    return null;
  }
}

function writeHomeChangeMessageCache(setting: HomeChangeMessageSetting) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      HOME_CHANGE_CACHE_KEY,
      JSON.stringify({ ...setting, cached_at: Date.now() } satisfies CachedHomeChangeMessage)
    );
  } catch {
    // Ignore storage failures; the RPC result is still usable for this render.
  }
}

export async function getHomeChangeMessage(): Promise<HomeChangeMessageSetting> {
  const cachedSetting = readHomeChangeMessageCache();
  if (cachedSetting) {
    return cachedSetting;
  }

  const supabase = getSupabaseClient();

  if (!supabase) {
    return { message: "", updated_at: null };
  }

  const { data, error } = await supabase.rpc("get_home_change_message");

  if (error) {
    throw new Error(error.message || "메인 변경사항 메시지를 불러오지 못했습니다.");
  }

  const setting = normalizeSetting(data);
  writeHomeChangeMessageCache(setting);
  return setting;
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

  const setting = normalizeSetting(data);
  writeHomeChangeMessageCache(setting);
  return setting;
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

  const setting = normalizeSetting(data);
  writeHomeChangeMessageCache(setting);
  return setting;
}
