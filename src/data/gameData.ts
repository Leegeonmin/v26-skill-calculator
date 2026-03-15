import type {
  CardType,
  PitcherRole,
  PlayerType,
  StarterHand,
  SkillMeta,
  SkillScoreTable,
} from "../types";
import { SKILLS as HITTER_SKILLS } from "./hitter/skills";
import { SKILL_SCORES as HITTER_SKILL_SCORES } from "./hitter/skillScores";
import { CARD_THRESHOLDS as HITTER_CARD_THRESHOLDS } from "./hitter/cardThresholds";
import { STARTER_SKILLS } from "./pitcher/starter/skills";
import {
  STARTER_SKILL_SCORES_LEFT,
  STARTER_SKILL_SCORES_RIGHT,
} from "./pitcher/starter/skillScores";
import {
  STARTER_CARD_THRESHOLDS_LEFT,
  STARTER_CARD_THRESHOLDS_RIGHT,
} from "./pitcher/starter/cardThresholds";
import { MIDDLE_SKILLS } from "./pitcher/middle/skills";
import { MIDDLE_SKILL_SCORES } from "./pitcher/middle/skillScores";
import { MIDDLE_CARD_THRESHOLDS } from "./pitcher/middle/cardThresholds";
import { CLOSER_SKILLS } from "./pitcher/closer/skills";
import { CLOSER_SKILL_SCORES } from "./pitcher/closer/skillScores";
import { CLOSER_CARD_THRESHOLDS } from "./pitcher/closer/cardThresholds";

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

export interface GameDataContext {
  playerType: PlayerType;
  pitcherRole?: PitcherRole;
  starterHand?: StarterHand;
}

export const HITTER_DATA_SET: GameDataSet = {
  playerType: "hitter",
  skills: HITTER_SKILLS,
  scoreTable: HITTER_SKILL_SCORES,
  thresholds: HITTER_CARD_THRESHOLDS,
};

// Structure-ready placeholders: pitcher data can be filled per role/hand later.
export const PITCHER_STARTER_DATA_SET_BY_HAND: Record<StarterHand, GameDataSet | null> = {
  right: {
    playerType: "pitcher",
    skills: STARTER_SKILLS,
    scoreTable: STARTER_SKILL_SCORES_RIGHT,
    thresholds: STARTER_CARD_THRESHOLDS_RIGHT,
  },
  left: {
    playerType: "pitcher",
    skills: STARTER_SKILLS,
    scoreTable: STARTER_SKILL_SCORES_LEFT,
    thresholds: STARTER_CARD_THRESHOLDS_LEFT,
  },
};

export const PITCHER_DATA_SET_BY_ROLE: Record<Exclude<PitcherRole, "starter">, GameDataSet | null> = {
  middle: {
    playerType: "pitcher",
    skills: MIDDLE_SKILLS,
    scoreTable: MIDDLE_SKILL_SCORES,
    thresholds: MIDDLE_CARD_THRESHOLDS,
  },
  closer: {
    playerType: "pitcher",
    skills: CLOSER_SKILLS,
    scoreTable: CLOSER_SKILL_SCORES,
    thresholds: CLOSER_CARD_THRESHOLDS,
  },
};

export function getGameDataSet({
  playerType,
  pitcherRole = "starter",
  starterHand = "right",
}: GameDataContext): GameDataSet | null {
  if (playerType === "hitter") return HITTER_DATA_SET;
  if (pitcherRole === "starter") return PITCHER_STARTER_DATA_SET_BY_HAND[starterHand];
  return PITCHER_DATA_SET_BY_ROLE[pitcherRole];
}
