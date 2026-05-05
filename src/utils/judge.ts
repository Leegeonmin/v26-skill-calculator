export type ResultGrade = "C" | "B" | "A" | "S" | "SS" | "SR+";

export interface JudgeResult {
  grade: ResultGrade;
}

export type ResultGradeThreshold = {
  grade: ResultGrade;
  maxProbability: number;
  expectedRolls: number;
};

export const RESULT_GRADE_THRESHOLDS: ResultGradeThreshold[] = [
  { grade: "SR+", maxProbability: 0.001, expectedRolls: 1000 },
  { grade: "SS", maxProbability: 0.005, expectedRolls: 200 },
  { grade: "S", maxProbability: 0.015, expectedRolls: 67 },
  { grade: "A", maxProbability: 0.05, expectedRolls: 20 },
  { grade: "B", maxProbability: 0.12, expectedRolls: 9 },
];

export function judgeSkillResultByProbability(
  scoreAtLeastProbability: number | null | undefined
): JudgeResult | null {
  if (scoreAtLeastProbability == null || !Number.isFinite(scoreAtLeastProbability)) {
    return null;
  }

  const matchedThreshold = RESULT_GRADE_THRESHOLDS.find(
    (threshold) => scoreAtLeastProbability <= threshold.maxProbability
  );

  return { grade: matchedThreshold?.grade ?? "C" };
}
