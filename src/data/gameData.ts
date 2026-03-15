import type { CardType, PlayerType, SkillMeta, SkillScoreTable } from "../types";
import { SKILLS } from "./skills";
import { SKILL_SCORES } from "./skillScores";
import { CARD_THRESHOLDS } from "./cardThresholds";

export interface CardThresholdRow {
  score: number;
  percent: number;
}

export interface GameDataSet {
  playerType: PlayerType;
  skills: SkillMeta[];
  scoreTable: SkillScoreTable;
  thresholds: Record<CardType, CardThresholdRow[]>;
}

export const HITTER_DATA_SET: GameDataSet = {
  playerType: "hitter",
  skills: SKILLS,
  scoreTable: SKILL_SCORES,
  thresholds: CARD_THRESHOLDS,
};

// 아직 미구현
export const PITCHER_DATA_SET: GameDataSet | null = null;

export function getGameDataSet(playerType: PlayerType): GameDataSet | null {
  if (playerType === "hitter") return HITTER_DATA_SET;
  if (playerType === "pitcher") return PITCHER_DATA_SET;
  return null;
}