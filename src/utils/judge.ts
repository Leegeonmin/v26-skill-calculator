import type { CardType } from "../types";

export type ResultGrade = "F" | "C" | "A" | "S" | "SSR+";

export interface CardThresholdRow {
  score: number;
  percent: number;
}

export interface JudgeResult {
  grade: ResultGrade;
}

function getPercentByScore(
  thresholds: Record<CardType, CardThresholdRow[]>,
  cardType: CardType,
  totalScore: number
): number | null {
  const table = thresholds[cardType];

  let thresholdPercent: number | null = null;

  for (const row of table) {
    if (totalScore >= row.score) {
      thresholdPercent = row.percent;
    }
  }

  return thresholdPercent;
}

export function judgeSkillResult(
  thresholds: Record<CardType, CardThresholdRow[]>,
  cardType: CardType,
  totalScore: number
): JudgeResult {
  const percent = getPercentByScore(thresholds, cardType, totalScore);

  if (percent === null) {
    return { grade: "F" };
  }

  if (percent <= 0.5) {
    return { grade: "SSR+" };
  }

  if (percent <= 1.5) {
    return { grade: "S" };
  }

  if (percent <= 7) {
    return { grade: "A" };
  }

  if (percent <= 12) {
    return { grade: "C" };
  }

  return { grade: "F" };
}
