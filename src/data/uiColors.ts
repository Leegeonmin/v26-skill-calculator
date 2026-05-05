import type { SkillGrade } from "../types";
import type { ResultGrade } from "../utils/judge";

export const SKILL_GRADE_COLORS: Record<SkillGrade, string> = {
  amateur: "#6b7280",
  rookie: "#16a34a",
  minor: "#2563eb",
  major: "#7c3aed",
  nationalOnly: "#dc2626",
};

export const RESULT_GRADE_COLORS: Record<ResultGrade, string> = {
  C: "#64748b",
  B: "#2563eb",
  A: "#16a34a",
  S: "#f59e0b",
  SS: "#ef4444",
  "SR+": "#dc2626",
};
