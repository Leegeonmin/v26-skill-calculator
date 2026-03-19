import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabase";

export async function signInWithGoogle() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
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
