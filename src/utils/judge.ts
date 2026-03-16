import type { CardType } from "../types";

export type ResultGrade = "F" | "C" | "A" | "S" | "SSR+";

export interface CardThresholdRow {
  score: number;
  percent: number;
}

export interface JudgeResult {
  matchedPercent: number | null;
  grade: ResultGrade;
}

function getPercentByScore(
  thresholds: Record<CardType, CardThresholdRow[]>,
  cardType: CardType,
  totalScore: number
): number | null {
  const table = thresholds[cardType];

  let matchedPercent: number | null = null;

  for (const row of table) {
    if (totalScore >= row.score) {
      matchedPercent = row.percent;
    }
  }

  return matchedPercent;
}

export function judgeSkillResult(
  thresholds: Record<CardType, CardThresholdRow[]>,
  cardType: CardType,
  totalScore: number
): JudgeResult {
  const percent = getPercentByScore(thresholds, cardType, totalScore);

  if (percent === null) {
    return { matchedPercent: null, grade: "F" };
  }

  if (percent <= 0.5) {
    return { matchedPercent: percent, grade: "SSR+" };
  }

  if (percent <= 1.5) {
    return { matchedPercent: percent, grade: "S" };
  }

  if (percent <= 7) {
    return { matchedPercent: percent, grade: "A" };
  }

  if (percent <= 12) {
    return { matchedPercent: percent, grade: "C" };
  }

  return { matchedPercent: percent, grade: "F" };
}
