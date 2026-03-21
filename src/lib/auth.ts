import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabase";

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  provider: string;
};

function generateRandomNickname(): string {
  const prefixes = ["푸른", "강한", "날랜", "빛난", "단단", "빠른", "맹렬한", "영리한"];
  const suffixes = ["타자", "에이스", "투수", "거포", "챌린저", "승부사", "히어로", "명장"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  const number = Math.floor(Math.random() * 90) + 10;

  return `${prefix}${suffix}${number}`;
}

export async function signInWithGoogle(redirectTo?: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectTo ?? window.location.origin,
    },
  });

  if (error) {
    throw error;
  }
}

export async function signOut() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export function getDisplayNameFromSession(session: Session | null): string | null {
  const user = session?.user;
  if (!user) return null;

  const metadata = user.user_metadata;

  return (
    metadata?.full_name ??
    metadata?.name ??
    metadata?.display_name ??
    user.email ??
    null
  );
}

export async function ensureProfile(session: Session | null) {
  const supabase = getSupabaseClient();

  if (!supabase || !session?.user) {
    return;
  }

  const user = session.user;
  const avatarUrl =
    typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;
  const provider =
    typeof user.app_metadata?.provider === "string" ? user.app_metadata.provider : "google";

  const { data: existingProfile, error: fetchError } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  const currentDisplayName = existingProfile?.display_name?.trim() || null;
  const nextDisplayName = currentDisplayName ?? generateRandomNickname();

  const payload = {
    id: user.id,
    display_name: nextDisplayName,
    avatar_url: avatarUrl,
    provider,
  };

  const { error } = existingProfile
    ? await supabase
        .from("profiles")
        .update({
          display_name: currentDisplayName ?? nextDisplayName,
          avatar_url: avatarUrl,
          provider,
        })
        .eq("id", user.id)
    : await supabase.from("profiles").insert(payload);

  if (error) {
    throw error;
  }
}

export async function getMyProfile(): Promise<Profile | null> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, provider")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as Profile | null) ?? null;
}

export async function updateMyProfileDisplayName(displayName: string): Promise<Profile> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  const normalizedName = displayName.trim();
  if (normalizedName.length < 2 || normalizedName.length > 12) {
    throw new Error("닉네임은 2자 이상 12자 이하로 입력해주세요.");
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: normalizedName })
    .eq("id", user.id)
    .select("id, display_name, avatar_url, provider")
    .single();

  if (error) {
    throw error;
  }

  return data as Profile;
}
