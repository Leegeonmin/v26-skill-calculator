import { getSupabaseClient } from "./supabase";

export type NoticeInquiryInput = {
  message: string;
  contact?: string;
};

export async function submitNoticeInquiry(input: NoticeInquiryInput): Promise<void> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase 설정이 필요합니다.");
  }

  const { error } = await supabase.rpc("submit_notice_inquiry", {
    p_message: input.message.trim(),
    p_contact: input.contact?.trim() || null,
    p_page_url: typeof window === "undefined" ? null : window.location.href,
    p_user_agent: typeof navigator === "undefined" ? null : navigator.userAgent,
  });

  if (error) {
    throw new Error(error.message || "문의 저장에 실패했습니다.");
  }
}
