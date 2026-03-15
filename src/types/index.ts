export type PlayerType = "hitter" | "pitcher";

export type PitcherRole = "starter" | "middle" | "closer";
export type StarterHand = "right" | "left";

export type CardType = "impact" | "signature" | "goldenGlove" | "national";

export type SkillLevel = 5 | 6 | 7 | 8;

export type SkillGrade =
  | "amateur"
  | "rookie"
  | "minor"
  | "major"
  | "nationalOnly";

export interface SkillScoreByLevel {
  5?: number;
  6?: number;
  7?: number;
  8?: number;
}

export interface SkillScoreTable {
  [skillId: string]: SkillScoreByLevel;
}

export interface SkillMeta {
  id: string;
  name: string;
  grade: SkillGrade;
  availableCardTypes: CardType[];
}

export type SkillOption = {
  key: string;
  label: string;
};
