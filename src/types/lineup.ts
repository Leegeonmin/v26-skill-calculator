import type { CalculatorMode, CardType, SkillGrade, SkillLevel, StarterHand } from ".";

export type LineupSkillRole = "hitter" | "pitcher";

export type LineupSkillApiSkill = {
  slot: number;
  name: string | null;
  level: number | null;
  matched: boolean;
  raw_text?: string;
  score?: number | null;
  source?: string;
  icon_box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  text_roi?: [number, number, number, number];
  level_roi?: [number, number, number, number];
  level_rule?: {
    green_pixels: number;
    white_pixels: number;
    left_bottom: number;
    top: number;
    right: number;
  };
};

export type LineupSkillApiLineupRow = {
  row: number;
  player: string;
  team: string | null;
  position: string | null;
  card_type: string | null;
  skills: LineupSkillApiSkill[];
  player_raw_text?: string;
  player_roi?: [number, number, number, number];
  team_raw_text?: string;
  team_roi?: [number, number, number, number];
  position_raw_text?: string;
  position_roi?: [number, number, number, number] | null;
  base_team?: string | null;
};

export type LineupSkillApiResponse = {
  ok: boolean;
  request_id: string | null;
  image: {
    path: string;
    width: number | null;
    height: number | null;
  };
  summary: {
    players: number;
    skills: number;
    matched_skills: number;
    unmatched_skills: number;
    unresolved_saved: number;
  };
  role: "all" | LineupSkillRole;
  base_team: string | null;
  lineup: LineupSkillApiLineupRow[];
  warnings: string[];
};

export type LineupSkillSelectedSkill = {
  slot: number;
  rawName: string | null;
  skillId: string | null;
  skillName: string | null;
  grade?: SkillGrade;
  level: SkillLevel;
  score: number;
  matched: boolean;
  alternatives: Array<{
    skillId: string;
    skillName: string;
  }>;
};

export type LineupSkillSelectedPlayer = {
  sourceRow: number;
  selected: boolean;
  playerName: string;
  team: string | null;
  position: string | null;
  starterHand?: StarterHand;
  cardType: CardType;
  calculatorMode: CalculatorMode;
  skills: LineupSkillSelectedSkill[];
  totalScore: number;
  pitcherScores?: {
    starterRight: number;
    starterLeft: number;
    middle: number;
    closer: number;
  };
};

export type LineupSkillSavedUpload = {
  id: string;
  role: LineupSkillRole;
  is_saved: boolean;
  image_name: string | null;
  request_id: string | null;
  raw_response?: LineupSkillApiResponse;
  selected_players: LineupSkillSelectedPlayer[];
  player_count: number;
  total_score: number;
  average_score: number;
  created_at: string;
  updated_at: string;
};
