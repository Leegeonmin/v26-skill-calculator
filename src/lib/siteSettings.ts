import { getSupabaseClient } from "./supabase";

export type HomeChangeMessageSetting = {
  message: string;
  updated_at: string | null;
};

export type IdleDevGameSetting = {
  enabled: boolean;
  updated_at: string | null;
};

const HOME_CHANGE_CACHE_KEY = "v26-home-change-message-cache";
const IDLE_DEV_GAME_CONFIG_CACHE_KEY = "v26-idle-dev-game-config-cache";
const HOME_CHANGE_CACHE_TTL_MS = 10 * 60 * 1000;
const IDLE_DEV_GAME_CONFIG_CACHE_TTL_MS = 60 * 1000;
const PUBLIC_HOME_CHANGE_MESSAGE_ENABLED = false;

type CachedHomeChangeMessage = HomeChangeMessageSetting & {
  cached_at: number;
};

type CachedIdleDevGameSetting = IdleDevGameSetting & {
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

function readIdleDevGameSettingCache(): IdleDevGameSetting | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawCache = window.localStorage.getItem(IDLE_DEV_GAME_CONFIG_CACHE_KEY);
    if (!rawCache) return null;

    const cache = JSON.parse(rawCache) as Partial<CachedIdleDevGameSetting>;
    if (
      typeof cache.cached_at !== "number" ||
      Date.now() - cache.cached_at > IDLE_DEV_GAME_CONFIG_CACHE_TTL_MS
    ) {
      window.localStorage.removeItem(IDLE_DEV_GAME_CONFIG_CACHE_KEY);
      return null;
    }

    return {
      enabled: cache.enabled === true,
      updated_at: typeof cache.updated_at === "string" ? cache.updated_at : null,
    };
  } catch {
    window.localStorage.removeItem(IDLE_DEV_GAME_CONFIG_CACHE_KEY);
    return null;
  }
}

function writeIdleDevGameSettingCache(setting: IdleDevGameSetting) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      IDLE_DEV_GAME_CONFIG_CACHE_KEY,
      JSON.stringify({ ...setting, cached_at: Date.now() } satisfies CachedIdleDevGameSetting)
    );
  } catch {
    // Ignore storage failures; the RPC result is still usable for this render.
  }
}

export async function getHomeChangeMessage(): Promise<HomeChangeMessageSetting> {
  if (!PUBLIC_HOME_CHANGE_MESSAGE_ENABLED) {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(HOME_CHANGE_CACHE_KEY);
    }

    return { message: "", updated_at: null };
  }

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

export async function getIdleDevGameSetting(): Promise<IdleDevGameSetting> {
  const cachedSetting = readIdleDevGameSettingCache();
  if (cachedSetting) {
    return cachedSetting;
  }

  try {
    const response = await fetch("/api/idle-dev-game/config", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`config request failed: ${response.status}`);
    }

    const payload = await response.json();
    const setting = {
      enabled: payload?.enabled === true,
      updated_at: typeof payload?.updatedAt === "string" ? payload.updatedAt : null,
    };
    writeIdleDevGameSettingCache(setting);
    return setting;
  } catch {
    return { enabled: false, updated_at: null };
  }
}

