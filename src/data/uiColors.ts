import type { SkillGrade } from "../types";
import type { ResultGrade } from "../utils/judge";

export const SKILL_GRADE_COLORS: Record<SkillGrade, string> = {
  amateur: "#6b7280",     // 회색
  rookie: "#16a34a",      // 초록
  minor: "#2563eb",       // 파랑
  major: "#7c3aed",       // 보라
  nationalOnly: "#dc2626" // 빨강
};

export const RESULT_GRADE_COLORS: Record<ResultGrade, string> = {
  일반: "#6b7280",
  뉴비: "#2563eb",
  타협: "#16a34a",
  준종결: "#f59e0b",
  찐종결: "#dc2626",
};