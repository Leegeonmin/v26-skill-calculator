import { getSupabaseClient } from "./supabase";
import type {
  SkillOcrApiResponse,
  SkillOcrRole,
  SkillOcrSavedUpload,
  SkillOcrSelectedPlayer,
} from "../types/ocr";

function requireSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase 설정이 필요합니다.");
  }

  return supabase;
}

function normalizeRpcError(error: { message?: string } | null, fallback: string): Error {
  if (error?.message?.includes("PUBLIC_SKILL_OCR_WEEKLY_LIMIT_REACHED")) {
    return new Error("이번 주 사용 횟수를 모두 사용했습니다.");
  }

  if (error?.message?.includes("AUTH_REQUIRED")) {
    return new Error("Google 로그인이 필요합니다.");
  }

  return new Error(error?.message || fallback);
}

type PublicUploadRow = Omit<SkillOcrSavedUpload, "role"> & {
  upload_role?: SkillOcrRole;
  role?: SkillOcrRole;
};

function mapPublicUploadRows(data: unknown): SkillOcrSavedUpload[] {
  return ((data ?? []) as PublicUploadRow[]).map((row) => ({
    ...row,
    role: row.role ?? row.upload_role ?? "hitter",
    is_saved: row.is_saved ?? true,
  }));
}

export async function skillOcrSavePublicUpload(input: {
  role: SkillOcrRole;
  imageName: string | null;
  requestId: string | null;
  rawResponse: SkillOcrApiResponse;
  selectedPlayers: SkillOcrSelectedPlayer[];
  totalScore: number;
  averageScore: number;
}): Promise<SkillOcrSavedUpload> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("skill_ocr_save_public_upload", {
    p_role: input.role,
    p_image_name: input.imageName,
    p_request_id: input.requestId,
    p_raw_response: input.rawResponse,
    p_selected_players: input.selectedPlayers,
    p_total_score: input.totalScore,
    p_average_score: input.averageScore,
  });

  if (error) {
    throw normalizeRpcError(error, "라인업 기록 저장에 실패했습니다.");
  }

  const upload = mapPublicUploadRows(data)[0] ?? null;
  if (!upload) {
    throw new Error("라인업 기록 저장에 실패했습니다.");
  }

  return upload;
}

export async function skillOcrFinalizePublicUpload(input: {
  uploadId: string;
  role: SkillOcrRole;
  imageName: string | null;
  requestId: string | null;
  rawResponse: SkillOcrApiResponse;
  selectedPlayers: SkillOcrSelectedPlayer[];
  totalScore: number;
  averageScore: number;
}): Promise<SkillOcrSavedUpload> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("skill_ocr_finalize_public_upload", {
    p_upload_id: input.uploadId,
    p_role: input.role,
    p_image_name: input.imageName,
    p_request_id: input.requestId,
    p_raw_response: input.rawResponse,
    p_selected_players: input.selectedPlayers,
    p_total_score: input.totalScore,
    p_average_score: input.averageScore,
  });

  if (error) {
    throw normalizeRpcError(error, "라인업 기록 저장에 실패했습니다.");
  }

  const upload = mapPublicUploadRows(data)[0] ?? null;
  if (!upload) {
    throw new Error("라인업 기록 저장에 실패했습니다.");
  }

  return upload;
}

export async function skillOcrListPublicUploads(limit = 20): Promise<SkillOcrSavedUpload[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("skill_ocr_list_public_uploads", {
    p_limit: limit,
  });

  if (error) {
    throw normalizeRpcError(error, "라인업 기록을 불러오지 못했습니다.");
  }

  return mapPublicUploadRows(data);
}

export async function skillOcrDeletePublicUpload(uploadId: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.rpc("skill_ocr_delete_public_upload", {
    p_upload_id: uploadId,
  });

  if (error) {
    throw normalizeRpcError(error, "라인업 기록을 삭제하지 못했습니다.");
  }
}
