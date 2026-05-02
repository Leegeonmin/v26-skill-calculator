import { getSupabaseClient } from "./supabase";
import type {
  SkillOcrApiResponse,
  SkillOcrRole,
  SkillOcrSavedUpload,
  SkillOcrSelectedPlayer,
  SkillOcrSession,
  SkillChangeResponse,
} from "../types/ocr";

const OCR_API_BASE_URL = import.meta.env.VITE_OCR_API_BASE_URL;
const ALLOWED_OCR_IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"]);

function requireSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase 설정이 필요합니다.");
  }

  return supabase;
}

function normalizeRpcError(error: { message?: string } | null, fallback: string): Error {
  return new Error(error?.message || fallback);
}

function getSingleRow<T>(data: unknown): T | null {
  const row = Array.isArray(data) ? data[0] : data;
  return (row as T | null) ?? null;
}

export async function recognizeSkillImage(input: {
  role: SkillOcrRole;
  file: File;
}): Promise<SkillOcrApiResponse> {
  if (!OCR_API_BASE_URL) {
    throw new Error("OCR API 설정이 필요합니다.");
  }

  const extension = input.file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_OCR_IMAGE_EXTENSIONS.has(extension)) {
    throw new Error("png, jpg, jpeg, webp 이미지만 업로드할 수 있습니다.");
  }

  const formData = new FormData();
  formData.append("image", input.file);
  const recognizeUrl = new URL("/recognize", OCR_API_BASE_URL);
  recognizeUrl.searchParams.set("role", input.role);

  const response = await fetch(recognizeUrl.toString(), {
    method: "POST",
    body: formData,
  });

  const data = (await response.json().catch(() => null)) as
    | SkillOcrApiResponse
    | { detail?: string }
    | null;

  if (!response.ok) {
    const detail = data && "detail" in data ? data.detail : null;
    throw new Error(detail || "이미지 인식 요청에 실패했습니다.");
  }

  if (!data || !("ok" in data) || !data.ok) {
    throw new Error("이미지 인식 결과가 올바르지 않습니다.");
  }

  return data;
}

export async function recognizeSkillChangeImage(file: File): Promise<SkillChangeResponse> {
  if (!OCR_API_BASE_URL) {
    throw new Error("OCR API 설정이 필요합니다.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_OCR_IMAGE_EXTENSIONS.has(extension)) {
    throw new Error("png, jpg, jpeg, webp 이미지만 업로드할 수 있습니다.");
  }

  const formData = new FormData();
  formData.append("image", file);
  const recognizeUrl = new URL("/recognize/skill-change", OCR_API_BASE_URL);

  const response = await fetch(recognizeUrl.toString(), {
    method: "POST",
    body: formData,
  });

  const data = (await response.json().catch(() => null)) as
    | SkillChangeResponse
    | { detail?: string }
    | null;

  if (!response.ok) {
    const detail = data && "detail" in data ? data.detail : null;
    throw new Error(detail || "스킬 변경 화면 인식 요청에 실패했습니다.");
  }

  if (!data || !("ok" in data) || !data.ok) {
    throw new Error("스킬 변경 화면 인식 결과가 올바르지 않습니다.");
  }

  return data;
}

export async function skillOcrLogin(
  username: string,
  password: string
): Promise<SkillOcrSession> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("skill_ocr_login", {
    p_username: username,
    p_password: password,
  });

  if (error) {
    throw normalizeRpcError(error, "로그인에 실패했습니다.");
  }

  const session = getSingleRow<SkillOcrSession>(data);
  if (!session) {
    throw new Error("로그인에 실패했습니다.");
  }

  return session;
}

export async function skillOcrValidateSession(
  sessionToken: string
): Promise<SkillOcrSession | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("skill_ocr_validate_session", {
    p_session_token: sessionToken,
  });

  if (error) {
    throw normalizeRpcError(error, "세션 확인에 실패했습니다.");
  }

  return getSingleRow<SkillOcrSession>(data);
}

export async function skillOcrLogout(sessionToken: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.rpc("skill_ocr_logout", {
    p_session_token: sessionToken,
  });

  if (error) {
    throw normalizeRpcError(error, "로그아웃에 실패했습니다.");
  }
}

export async function skillOcrSaveUpload(input: {
  sessionToken: string;
  role: SkillOcrRole;
  imageName: string | null;
  requestId: string | null;
  rawResponse: SkillOcrApiResponse;
  selectedPlayers: SkillOcrSelectedPlayer[];
  totalScore: number;
  averageScore: number;
}): Promise<SkillOcrSavedUpload> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("skill_ocr_save_upload", {
    p_session_token: input.sessionToken,
    p_role: input.role,
    p_image_name: input.imageName,
    p_request_id: input.requestId,
    p_raw_response: input.rawResponse,
    p_selected_players: input.selectedPlayers,
    p_total_score: input.totalScore,
    p_average_score: input.averageScore,
  });

  if (error) {
    throw normalizeRpcError(error, "OCR 결과 저장에 실패했습니다.");
  }

  const upload = getSingleRow<SkillOcrSavedUpload>(data);
  if (!upload) {
    throw new Error("OCR 결과 저장에 실패했습니다.");
  }

  return upload;
}

export async function skillOcrListUploads(
  sessionToken: string,
  limit = 20
): Promise<SkillOcrSavedUpload[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("skill_ocr_list_uploads", {
    p_session_token: sessionToken,
    p_limit: limit,
  });

  if (error) {
    throw normalizeRpcError(error, "OCR 기록을 불러오지 못했습니다.");
  }

  return (data ?? []) as SkillOcrSavedUpload[];
}

export async function skillOcrGetUpload(
  sessionToken: string,
  uploadId: string
): Promise<SkillOcrSavedUpload | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("skill_ocr_get_upload", {
    p_session_token: sessionToken,
    p_upload_id: uploadId,
  });

  if (error) {
    throw normalizeRpcError(error, "OCR 기록을 불러오지 못했습니다.");
  }

  return getSingleRow<SkillOcrSavedUpload>(data);
}
