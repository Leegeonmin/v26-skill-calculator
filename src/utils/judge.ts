import type { CardType } from "../types";

export type ResultGrade =
  | "일반"
  | "뉴비"
  | "타협"
  | "준종결"
  | "찐종결";

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
    return { matchedPercent: null, grade: "일반" };
  }

  if (percent <= 0.5) {
    return { matchedPercent: percent, grade: "찐종결" };
  }

  if (percent <= 1.5) {
    return { matchedPercent: percent, grade: "준종결" };
  }

  if (percent <= 7) {
    return { matchedPercent: percent, grade: "타협" };
  }

  if (percent <= 12) {
    return { matchedPercent: percent, grade: "뉴비" };
  }

  return { matchedPercent: percent, grade: "일반" };
}